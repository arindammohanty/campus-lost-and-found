import { NextRequest, NextResponse } from 'next/server';
import { extractAIFeatures } from '@/utils/aiEngine';

export async function POST(req: NextRequest) {
  try {
    const { title = '', description = '', hint = '' } = await req.json();
    const result = extractAIFeatures(title, description, hint);

    return NextResponse.json({
      success: true,
      analysis: result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
