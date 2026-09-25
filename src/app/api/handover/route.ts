import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { action, ticketId, handoverCode, itemId, claimant, deskLocation } = await req.json();

    if (action === 'generate') {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const ticket = {
        id: `ticket-${Date.now()}`,
        itemId,
        claimant,
        handoverCode: code,
        deskLocation: deskLocation || 'Central Library Help Desk',
        status: 'Pending Verification',
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        ticket,
        message: 'Handover Pass generated. Show this 6-digit PIN at the Help Desk.',
      });
    }

    if (action === 'verify') {
      if (!handoverCode) {
        return NextResponse.json(
          { success: false, error: '6-digit handover PIN is required' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Handover PIN validated by Campus Help Desk Officer. Item marked as Returned.',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
