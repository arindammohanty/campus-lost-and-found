import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const MessageSchema = z.object({
  itemId: z.string().min(1).max(100),
  senderId: z.string().min(1).max(100),
  senderName: z.string().max(100).optional(),
  senderRole: z.enum(['finder', 'owner', 'helpdesk']).default('finder'),
  text: z.string().min(1).max(2000),
  claimantId: z.string().max(100).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    const claimantId = searchParams.get('claimantId') || undefined;

    if (!itemId || itemId.length > 100) {
      return NextResponse.json({ success: false, error: 'Valid itemId query parameter is required' }, { status: 400 });
    }

    const threadId = claimantId ? `${itemId}_${claimantId}` : undefined;

    return NextResponse.json({
      success: true,
      itemId,
      claimantId,
      threadId,
      messages: [],
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Malformed JSON payload' }, { status: 400 });
  }

  try {
    const validated = MessageSchema.parse(body);

    const threadId = validated.claimantId
      ? `${validated.itemId}_${validated.claimantId}`
      : `${validated.itemId}_${validated.senderId}`;

    const newMessage = {
      id: `msg-${Date.now()}`,
      itemId: validated.itemId,
      threadId,
      senderId: validated.senderId,
      senderName: validated.senderName || 'Anonymous User',
      senderRole: validated.senderRole,
      text: validated.text.trim(),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
