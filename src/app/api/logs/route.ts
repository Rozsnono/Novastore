import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AppLog from '@/lib/models/AppLog';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
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
      context: typeof context === 'object' && context !== null ? context : {},
    });

    return NextResponse.json({ success: true, id: logEntry._id }, { status: 201 });
  } catch (error: any) {
    console.error('Error recording application log:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save log' },
      { status: 500 }
    );
  }
}
