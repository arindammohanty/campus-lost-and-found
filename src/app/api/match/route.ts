import { NextRequest, NextResponse } from 'next/server';
import { calculateMatchScore } from '@/utils/aiEngine';
import { Item } from '@/types/portal';

export async function POST(req: NextRequest) {
  try {
    const { targetItem, candidates } = await req.json();

    if (!targetItem || !Array.isArray(candidates)) {
      return NextResponse.json(
        { error: 'targetItem and candidates array are required' },
        { status: 400 }
      );
    }

    const matches = candidates
      .filter((candidate: Item) => candidate.type !== targetItem.type)
      .map((candidate: Item) => {
        const lost = targetItem.type === 'Lost' ? targetItem : candidate;
        const found = targetItem.type === 'Found' ? targetItem : candidate;
        const { score, reasons, similarity } = calculateMatchScore(lost, found);
        return {
          item: candidate,
          score,
          reasons,
          similarity,
        };
      })
      .filter((m: any) => m.score >= 35)
      .sort((a: any, b: any) => b.score - a.score);

    return NextResponse.json({
      success: true,
      matches,
      total: matches.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
