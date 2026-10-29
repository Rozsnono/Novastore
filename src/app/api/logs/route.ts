import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AppLog from '@/lib/models/AppLog';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!checkRateLimit(`client-logs:${getClientIp(req)}`, 60, 60000)) {
    return NextResponse.json(
      { error: 'Túl sok naplóbejegyzés. Próbáld újra később.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { level = 'error', source = 'mobile-app', message, stack, context } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Log message is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const logEntry = await AppLog.create({
      level: ['error', 'warn', 'info'].includes(level) ? level : 'error',
      source: ['mobile-app', 'backend-api', 'admin-dashboard'].includes(source)
        ? source
        : 'mobile-app',
      message: String(message).substring(0, 1000),
      stack: stack ? String(stack).substring(0, 5000) : '',
      context:
        typeof context === 'object' && context !== null && JSON.stringify(context).length <= 10000
          ? context
          : {},
    });

    return NextResponse.json({ success: true, id: logEntry._id }, { status: 201 });
  } catch (error: any) {
    console.error('Error recording application log:', error);
    return NextResponse.json(
      { error: 'Failed to save log' },
      { status: 500 }
    );
  }
}
