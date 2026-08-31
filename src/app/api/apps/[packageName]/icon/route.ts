import { NextRequest, NextResponse } from 'next/server';
import { getAppStoragePath, getFileBufferFromWebDAV } from '@/lib/webdav';
import mediaCache from '@/lib/cache';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ packageName: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { packageName } = await context.params;
  const cacheKey = `icon_${packageName}`;

  const url = new URL(req.url);
  const bypassCache = url.searchParams.has('t');

  // 1. Check in-memory LRU cache
  if (!bypassCache) {
    const cached = mediaCache.get(cacheKey);
    if (cached) {
      return new NextResponse(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
          'X-Cache': 'HIT',
        },
      });
    }
  }

  // 2. Fetch from WebDAV NAS
  try {
    const appDir = getAppStoragePath(packageName);
    const remoteIconPath = `${appDir}/icon.png`;
    const buffer = await getFileBufferFromWebDAV(remoteIconPath);

    const contentType = 'image/png';
    mediaCache.set(cacheKey, buffer, contentType);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': bypassCache
          ? 'no-cache, no-store, must-revalidate'
          : 'public, max-age=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
      },
    });
  } catch (error: any) {
    console.error(`Error proxying icon for ${packageName}:`, error);
    // Return a default SVG placeholder if icon is not found on NAS
    const fallbackSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
        <rect width="128" height="128" rx="28" fill="#4f46e5"/>
        <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="44" fill="#ffffff">
          ${packageName.charAt(0).toUpperCase()}
        </text>
      </svg>
    `.trim();

    return new NextResponse(fallbackSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
}
