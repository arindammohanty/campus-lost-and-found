import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get('itemId');

  if (!itemId) {
    return NextResponse.json({ error: 'itemId query parameter is required' }, { status: 400 });
  }

  // API returns success structure for client sync
  return NextResponse.json({
    success: true,
    itemId,
    messages: [],
  });
}

export async function POST(req: NextRequest) {
  try {
    const { itemId, senderId, senderName, senderRole, text } = await req.json();

    if (!itemId || !senderId || !text) {
      return NextResponse.json(
        { error: 'itemId, senderId, and text are required fields' },
        { status: 400 }
      );
    }

    const newMessage = {
      id: `msg-${Date.now()}`,
      itemId,
      senderId,
      senderName: senderName || 'Anonymous User',
      senderRole: senderRole || 'finder',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
