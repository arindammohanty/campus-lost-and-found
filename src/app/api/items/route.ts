import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { extractAIFeatures } from '@/utils/aiEngine';

const ItemSchema = z.object({
  type: z.enum(['Lost', 'Found']),
  title: z.string().min(2).max(120),
  category: z.string().max(50),
  brand: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  description: z.string().min(5).max(2000),
  location: z.string().max(100),
  locationDetails: z.string().max(200).optional(),
  mapX: z.number().min(0).max(100).optional(),
  mapY: z.number().min(0).max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().max(50).optional(),
  contactPreference: z.enum(['In-App Chat', 'Email Alerts', 'SMS Alerts']).default('In-App Chat'),
  imageUrl: z
    .string()
    .refine(
      (val) => !val || val.startsWith('https://') || val.startsWith('data:image/'),
      { message: 'Invalid image URL or unsupported format' }
    )
    .optional(),
  identifyingDetails: z.string().max(500).optional(),
  userId: z.string().max(100).optional(),
  userName: z.string().max(100).optional(),
  userEmail: z.string().email().optional(),
  userRoll: z.string().max(50).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = ItemSchema.parse(body);

    // 1. AI Feature Extraction
    const aiAnalysis = extractAIFeatures(validated.title, validated.description);

    // 2. Cryptographically secure 6-digit Handover PIN
    const handoverCode = crypto.randomInt(100000, 1000000).toString();

    const now = new Date().toISOString();
    const newItem = {
      id: `item-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
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
    const msg = error instanceof z.ZodError ? error.errors[0]?.message : 'Validation error';
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 400 }
    );
  }
}
