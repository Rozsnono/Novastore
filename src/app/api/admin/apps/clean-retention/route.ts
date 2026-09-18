import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { enforceMaxApkRetention } from '@/lib/webdav';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { packageName, maxFiles } = await req.json();

    if (!packageName || typeof packageName !== 'string') {
      return NextResponse.json(
        { error: 'packageName is required' },
        { status: 400 }
      );
    }

    const limit = typeof maxFiles === 'number' && maxFiles > 0 ? maxFiles : 3;
    const result = await enforceMaxApkRetention(packageName.trim(), limit);

    return NextResponse.json({
      success: true,
      packageName,
      maxFiles: limit,
      deletedCount: result.deleted.length,
      deletedFiles: result.deleted,
      remainingFiles: result.remaining,
    });
  } catch (error: any) {
    console.error('Error cleaning APK retention:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clean APK retention' },
      { status: 500 }
    );
  }
}
