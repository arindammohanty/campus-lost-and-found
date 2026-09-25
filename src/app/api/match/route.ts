import { NextRequest, NextResponse } from 'next/server';
import { calculateMatchScore } from '@/utils/aiEngine';
import { Item } from '@/types/portal';

const MAX_CANDIDATES = 50;

export async function POST(req: NextRequest) {
  try {
    const { targetItem, candidates } = await req.json();

    if (!targetItem || !Array.isArray(candidates)) {
      return NextResponse.json(
        { error: 'targetItem and candidates array are required' },
        { status: 400 }
      );
    }

    // Limit evaluation array size to prevent CPU algorithmic exhaustion
    const boundedCandidates = candidates.slice(0, MAX_CANDIDATES);

    const matches = boundedCandidates
      .filter((candidate: Item) => candidate && candidate.id !== targetItem.id && candidate.type !== targetItem.type)
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
      .filter((m: any) => m.score >= 30)
      .sort((a: any, b: any) => b.score - a.score);

    return NextResponse.json({
      success: true,
      matches,
      total: matches.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to evaluate similarity matches' },
      { status: 500 }
    );
  }
}
