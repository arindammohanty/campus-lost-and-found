import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractAIFeatures } from '@/utils/aiEngine';

const AIAnalyzeSchema = z.object({
  title: z.string().max(300).default(''),
  description: z.string().max(5000).default(''),
  hint: z.string().max(500).default(''),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = AIAnalyzeSchema.parse(body);
    const result = extractAIFeatures(validated.title, validated.description, validated.hint);

    return NextResponse.json({
      success: true,
      analysis: result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to process AI visual features' }, { status: 500 });
  }
}
