import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractAIFeatures } from '@/utils/aiEngine';

const ItemSchema = z.object({
  type: z.enum(['Lost', 'Found']),
  title: z.string().min(2),
  category: z.string(),
  brand: z.string().optional(),
  color: z.string().optional(),
  description: z.string().min(5),
  location: z.string(),
  locationDetails: z.string().optional(),
  mapX: z.number().optional(),
  mapY: z.number().optional(),
  date: z.string(),
  time: z.string().optional(),
  contactPreference: z.enum(['In-App Chat', 'Email Alerts', 'SMS Alerts']).default('In-App Chat'),
  imageUrl: z.string().optional(),
  identifyingDetails: z.string().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  userEmail: z.string().optional(),
  userRoll: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = ItemSchema.parse(body);

    // 1. AI Feature Extraction
    const aiAnalysis = extractAIFeatures(validated.title, validated.description);

    // 2. Generate 6-Digit Handover PIN
    const handoverCode = Math.floor(100000 + Math.random() * 900000).toString();

    const now = new Date().toISOString();
    const newItem = {
      id: `item-${Date.now()}`,
      ...validated,
      category: validated.category || aiAnalysis.category,
      color: validated.color || aiAnalysis.color,
      brand: validated.brand || aiAnalysis.brand,
      aiTags: aiAnalysis.tags,
      aiConfidence: aiAnalysis.confidence,
      handoverCode,
      status: 'Active',
      historyLog: [
        {
          status: 'Reported',
          timestamp: now,
          note: `Item registered via Next.js API`,
          actor: validated.userName || 'Student',
        },
        {
          status: 'Under Review',
          timestamp: new Date(Date.now() + 500).toISOString(),
          note: `AI visual & semantic analysis complete`,
          actor: 'AI Visual Engine',
        },
        {
          status: 'Active',
          timestamp: new Date(Date.now() + 1000).toISOString(),
          note: `Published to campus radar`,
          actor: 'System',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({
      success: true,
      item: newItem,
      message: 'Item registered and AI features extracted successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Validation error processing item request',
      },
      { status: 400 }
    );
  }
}
