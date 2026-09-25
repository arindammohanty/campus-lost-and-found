import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory rate-limiter and failed attempt tracker
// Key: ticketId, Value: { attempts: number, lockedUntil?: number }
const ticketAttempts = new Map<string, { attempts: number; lockedUntil?: number }>();
const MAX_VERIFICATION_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ticketId, handoverCode, expectedCode, itemId, claimant, deskLocation } = body;

    // 1. GENERATE HANDOVER PASS
    if (action === 'generate') {
      // Cryptographically secure 6-digit PIN (100000 - 999999)
      const securePin = crypto.randomInt(100000, 1000000).toString();

      const ticket = {
        id: `ticket-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        itemId,
        claimant,
        handoverCode: securePin,
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

    // 2. VERIFY HANDOVER AT HELP DESK
    if (action === 'verify') {
      if (!ticketId || typeof ticketId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Valid ticketId is required' },
          { status: 400 }
        );
      }

      if (!handoverCode || !/^\d{6}$/.test(String(handoverCode).trim())) {
        return NextResponse.json(
          { success: false, error: 'Valid 6-digit numeric handover PIN is required' },
          { status: 400 }
        );
      }

      // Check for brute-force lockouts
      const now = Date.now();
      const attemptData = ticketAttempts.get(ticketId) || { attempts: 0 };

      if (attemptData.lockedUntil && now < attemptData.lockedUntil) {
        const remainingMinutes = Math.ceil((attemptData.lockedUntil - now) / 60000);
        return NextResponse.json(
          {
            success: false,
            error: `Too many failed attempts. This ticket is locked for security. Please try again in ${remainingMinutes} minute(s) or consult the Campus Security Office.`,
          },
          { status: 429 }
        );
      }

      const inputPin = String(handoverCode).trim();
      const targetPin = String(expectedCode || '').trim();

      if (!targetPin) {
        return NextResponse.json(
          { success: false, error: 'Target ticket validation parameters missing' },
          { status: 400 }
        );
      }

      // Constant-time string comparison to prevent timing attacks
      const inputBuffer = Buffer.from(inputPin);
      const expectedBuffer = Buffer.from(targetPin);

      const isMatch =
        inputBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(inputBuffer, expectedBuffer);

      if (!isMatch) {
        attemptData.attempts += 1;
        if (attemptData.attempts >= MAX_VERIFICATION_ATTEMPTS) {
          attemptData.lockedUntil = now + LOCKOUT_DURATION_MS;
          ticketAttempts.set(ticketId, attemptData);
          return NextResponse.json(
            {
              success: false,
              error: `Maximum verification attempts exceeded. Ticket #${ticketId.slice(
                -6
              )} is now locked for 15 minutes.`,
            },
            { status: 429 }
          );
        }

        ticketAttempts.set(ticketId, attemptData);
        const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - attemptData.attempts;
        return NextResponse.json(
          {
            success: false,
            error: `Invalid handover PIN. ${remainingAttempts} attempt(s) remaining before security lockout.`,
          },
          { status: 400 }
        );
      }

      // Successful verification: clear failed attempts
      ticketAttempts.delete(ticketId);

      return NextResponse.json({
        success: true,
        message: 'Handover PIN verified successfully by Campus Help Desk Officer. Item marked as Returned.',
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'An error occurred during handover processing' },
      { status: 500 }
    );
  }
}
