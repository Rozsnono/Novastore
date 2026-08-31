import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';
import { getFileBufferFromWebDAV } from '@/lib/webdav';
import { getUserFromRequest, canUserAccessApp } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ packageName: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { packageName } = await context.params;

  try {
    await connectToDatabase();
    const app = await AppItem.findOne({ packageName: packageName.toLowerCase().trim() });

    if (!app || !app.apkWebDavPath) {
      return NextResponse.json(
        { error: `APK for package "${packageName}" not found` },
        { status: 404 }
      );
    }

    // Access control verification
    const user = await getUserFromRequest(req);
    const access = canUserAccessApp(user, app);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason || 'Hozzáférés megtagadva ehhez az alkalmazáshoz' },
        { status: 403 }
      );
    }

    // Fetch APK buffer from WebDAV NAS
    const fullBuffer = await getFileBufferFromWebDAV(app.apkWebDavPath);
    const totalSize = fullBuffer.length;

    const rangeHeader = req.headers.get('range');

    if (rangeHeader) {
      // Parse Range header e.g. "bytes=0-4194303"
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

        if (start >= totalSize || end >= totalSize || start > end) {
          return new NextResponse(null, {
            status: 416,
            headers: {
              'Content-Range': `bytes */${totalSize}`,
            },
          });
        }

        const chunk = fullBuffer.subarray(start, end + 1);

        return new NextResponse(new Uint8Array(chunk), {
          status: 206,
          headers: {
            'Content-Type': 'application/vnd.android.package-archive',
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunk.length.toString(),
            'Cache-Control': 'no-cache',
            'Content-Disposition': `attachment; filename="${packageName}-v${app.versionCode}.apk"`,
          },
        });
      }
    }

    // Full file download (fallback if no range requested)
    return new NextResponse(new Uint8Array(fullBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Accept-Ranges': 'bytes',
        'Content-Length': totalSize.toString(),
        'Cache-Control': 'no-cache',
        'Content-Disposition': `attachment; filename="${packageName}-v${app.versionCode}.apk"`,
      },
    });
  } catch (error: any) {
    console.error(`Error streaming APK download for ${packageName}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to download APK from storage' },
      { status: 500 }
    );
  }
}
