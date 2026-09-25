import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateMatchScore } from '@/utils/aiEngine';
import { Item } from '@/types/portal';

const MAX_CANDIDATES = 50;

const MatchSchema = z.object({
  targetItem: z.object({
    id: z.string().max(100),
    type: z.enum(['Lost', 'Found']),
    title: z.string().max(200).optional(),
    category: z.string().max(100).optional(),
    description: z.string().max(3000).optional(),
    location: z.string().max(200).optional(),
  }).passthrough(),
  candidates: z.array(z.any()).max(200),
});

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Malformed JSON payload' }, { status: 400 });
  }

  try {
    const validated = MatchSchema.parse(body);

    const { targetItem, candidates } = validated;

    // Limit evaluation array size to prevent CPU algorithmic exhaustion
    const boundedCandidates = candidates.slice(0, MAX_CANDIDATES);

    const matches = boundedCandidates
      .filter((candidate: Item) => candidate && candidate.id !== targetItem.id && candidate.type !== targetItem.type)
      .map((candidate: Item) => {
        const lost = targetItem.type === 'Lost' ? (targetItem as unknown as Item) : candidate;
        const found = targetItem.type === 'Found' ? (targetItem as unknown as Item) : candidate;
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to evaluate similarity matches' },
      { status: 500 }
    );
  }
}
