import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getAppStoragePath, nasUploadBuffer } from '@/lib/nasStorage';
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
    // Kisbetűsítés: a katalógus is kisbetűs csomagnevet használ, így a NAS-útvonal és a cache-kulcs egyezik
    const packageName = ((formData.get('packageName') as string) || '').toLowerCase().trim();
    const file = formData.get('file') as File | null;
    const index = formData.get('index') as string | null;

    if (!type || !packageName || !file) {
      return NextResponse.json(
        { error: 'Missing required media upload fields' },
        { status: 400 }
      );
    }

    // A képernyőkép-index a NAS-útvonal része: csak számjegy lehet
    if (index !== null && !/^\d{1,3}$/.test(index)) {
      return NextResponse.json({ error: 'Invalid screenshot index' }, { status: 400 });
    }

    // Méretkorlát (10 MB) a memóriába töltés előtt
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'A fájl túl nagy (max. 10 MB)' }, { status: 413 });
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

    await nasUploadBuffer(remotePath, buffer);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      remotePath,
    });
  } catch (error: any) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload media to storage' },
      { status: 500 }
    );
  }
}
