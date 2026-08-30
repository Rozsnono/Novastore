import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getAppStoragePath, uploadBufferToWebDAV } from '@/lib/webdav';
import mediaCache from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const type = formData.get('type') as string; // 'icon' | 'screenshot'
    const packageName = formData.get('packageName') as string;
    const file = formData.get('file') as File | null;
    const index = formData.get('index') as string | null;

    if (!type || !packageName || !file) {
      return NextResponse.json(
        { error: 'Missing required media upload fields' },
        { status: 400 }
      );
    }

    const appDir = getAppStoragePath(packageName);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let remotePath = '';
    let publicUrl = '';

    if (type === 'icon') {
      remotePath = `${appDir}/icon.png`;
      publicUrl = `/api/apps/${packageName}/icon`;
      // Invalidate existing cache
      mediaCache.invalidate(`icon_${packageName}`);
    } else if (type === 'screenshot') {
      const screenIndex = index !== null ? index : '0';
      remotePath = `${appDir}/screenshots/screenshot_${screenIndex}.png`;
      publicUrl = `/api/apps/${packageName}/screenshots/${screenIndex}`;
      mediaCache.invalidate(`screenshot_${packageName}_${screenIndex}`);
    } else {
      return NextResponse.json({ error: 'Invalid media type' }, { status: 400 });
    }

    await uploadBufferToWebDAV(remotePath, buffer);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      remotePath,
    });
  } catch (error: any) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload media to WebDAV' },
      { status: 500 }
    );
  }
}
