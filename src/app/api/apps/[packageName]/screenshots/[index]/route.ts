import { NextRequest, NextResponse } from 'next/server';
import { getAppStoragePath, getFileBufferFromWebDAV } from '@/lib/webdav';
import mediaCache from '@/lib/cache';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ packageName: string; index: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { packageName, index } = await context.params;
  const cacheKey = `screenshot_${packageName}_${index}`;

  // 1. Check in-memory cache
  const cached = mediaCache.get(cacheKey);
  if (cached) {
    return new NextResponse(new Uint8Array(cached.buffer), {
      status: 200,
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
        'X-Cache': 'HIT',
      },
    });
  }

  // 2. Fetch from WebDAV NAS
  try {
    const appDir = getAppStoragePath(packageName);
    const remotePath = `${appDir}/screenshots/screenshot_${index}.png`;
    const buffer = await getFileBufferFromWebDAV(remotePath);

    const contentType = 'image/png';
    mediaCache.set(cacheKey, buffer, contentType);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
        'X-Cache': 'MISS',
      },
    });
  } catch (error: any) {
    console.error(`Error proxying screenshot ${index} for ${packageName}:`, error);
    return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
  }
}
