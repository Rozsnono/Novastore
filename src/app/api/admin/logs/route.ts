import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import AppLog from '@/lib/models/AppLog';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get('level');
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);

    await connectToDatabase();

    const query: any = {};
    if (level && level !== 'all') {
      query.level = level;
    }
    if (source && source !== 'all') {
      query.source = source;
    }
    if (search && search.trim()) {
      query.$or = [
        { message: { $regex: search.trim(), $options: 'i' } },
        { stack: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [logs, total, totalErrors] = await Promise.all([
      AppLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AppLog.countDocuments(query),
      AppLog.countDocuments({ level: 'error' }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      stats: {
        total,
        totalErrors,
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    await AppLog.deleteMany({});

    return NextResponse.json({
      success: true,
      message: 'All logs cleared successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to clear logs' },
      { status: 500 }
    );
  }
}
