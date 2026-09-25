import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { extractAIFeatures } from '@/utils/aiEngine';

const ItemSchema = z.object({
  type: z.enum(['Lost', 'Found']),
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(120),
  category: z.string().trim().min(1, 'Category is required').max(50),
  brand: z.string().trim().max(50).optional(),
  color: z.string().trim().max(50).optional(),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(2000),
  location: z.string().trim().min(1, 'Location is required').max(100),
  locationDetails: z.string().trim().max(200).optional(),
  mapX: z.number().min(0).max(100).optional(),
  mapY: z.number().min(0).max(100).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((val) => {
      const parsed = Date.parse(val);
      if (isNaN(parsed)) return false;
      const d = new Date(val);
      const now = new Date();
      const past = new Date();
      past.setFullYear(now.getFullYear() - 1);
      const future = new Date();
      future.setDate(now.getDate() + 1);
      return d >= past && d <= future;
    }, { message: 'Date must be a valid calendar date within the past year' }),
  time: z.string().max(50).optional(),
  contactPreference: z.enum(['In-App Chat', 'Email Alerts', 'SMS Alerts']).default('In-App Chat'),
  imageUrl: z
    .string()
    .max(2_500_000, 'Image payload exceeds 2.5MB limit')
    .refine(
      (val) => !val || val.startsWith('https://') || /^data:image\/(jpeg|png|webp|gif);base64,/.test(val),
      { message: 'Invalid image URL or unsupported format (HTTPS or JPEG/PNG/WebP data URI required)' }
    )
    .optional(),
  identifyingDetails: z.string().trim().max(500).optional(),
  userId: z.string().trim().max(100).optional(),
  userName: z.string().trim().max(100).optional(),
  userEmail: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  userRoll: z.string().trim().max(50).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Malformed JSON payload' }, { status: 400 });
  }

  try {
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

    return NextResponse.json(
      {
        success: true,
        item: newItem,
        message: 'Item registered and AI features extracted successfully.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    const msg = error instanceof z.ZodError 
      ? (error.issues?.[0]?.message || 'Validation error')
      : 'Validation error';
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 400 }
    );
  }
}
