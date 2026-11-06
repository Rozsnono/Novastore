import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';
import { getFileStreamFromWebDAV, getFileStatFromWebDAV } from '@/lib/webdav';
import { getUserFromRequest, canUserAccessApp } from '@/lib/userAuth';
import { buildDirectDownloadUrl, toWebDavRelativePath } from '@/lib/storageApi';
import { getDownloadKey } from '@/lib/settings';

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

    // Access control verification with fresh DB lookup
    const user = await getUserFromRequest(req, true);
    const access = canUserAccessApp(user, app);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason || 'Hozzáférés megtagadva ehhez az alkalmazáshoz' },
        { status: 403 }
      );
    }

    // Content-Disposition fejlécbe csak biztonságos karakterek kerülhetnek
    const safeFileBase = packageName.replace(/[^a-zA-Z0-9._-]/g, '_');

    const forceStream = req.nextUrl.searchParams.get('stream') === 'true';

    // Direct high-performance redirect to dedicated NASiS3 download service (NewFileSharer pattern)
    if (!forceStream) {
      // A letöltő kulcs az admin Beállítások oldalról (titkosítva tárolva), env tartalékkal
      const directDownloadUrl = buildDirectDownloadUrl(app.apkWebDavPath, {
        apiKey: (await getDownloadKey()) || undefined,
      });
      if (directDownloadUrl.startsWith('https://')) {
        return NextResponse.redirect(directDownloadUrl, 307);
      }
    }

    // Determine total size
    let totalSize = Number(app.sizeBytes) || 0;
    if (totalSize <= 0) {
      try {
        const stat = await getFileStatFromWebDAV(toWebDavRelativePath(app.apkWebDavPath));
        totalSize = Number(stat.size) || 0;
      } catch (e) {
        console.warn(`Could not stat WebDAV file ${app.apkWebDavPath}:`, e);
      }
    }

    const rangeHeader = req.headers.get('range');

    if (rangeHeader && totalSize > 0) {
      // Parse Range header e.g. "bytes=0-4194303"
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        let end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

        // RFC 7233: a fájl végén túli végpontot levágjuk, nem utasítjuk el
        end = Math.min(end, totalSize - 1);

        if (start >= totalSize || start > end) {
          return new NextResponse(null, {
            status: 416,
            headers: {
              'Content-Range': `bytes */${totalSize}`,
            },
          });
        }

        const chunkLength = end - start + 1;
        const nodeStream = await getFileStreamFromWebDAV(toWebDavRelativePath(app.apkWebDavPath), { start, end });
        const webStream = Readable.toWeb(nodeStream as Readable);

        return new NextResponse(webStream as any, {
          status: 206,
          headers: {
            'Content-Type': 'application/vnd.android.package-archive',
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkLength.toString(),
            'Cache-Control': 'no-cache',
            'Content-Disposition': `attachment; filename="${safeFileBase}-v${app.versionCode}.apk"`,
          },
        });
      }
    }

    // Full file streaming download (Instant start, no RAM buffering)
    const nodeStream = await getFileStreamFromWebDAV(toWebDavRelativePath(app.apkWebDavPath));
    const webStream = Readable.toWeb(nodeStream as Readable);

    const headers: Record<string, string> = {
      'Content-Type': 'application/vnd.android.package-archive',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      'Content-Disposition': `attachment; filename="${safeFileBase}-v${app.versionCode}.apk"`,
    };

    if (totalSize > 0) {
      headers['Content-Length'] = totalSize.toString();
    }

    return new NextResponse(webStream as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error(`Error streaming APK download for ${packageName}:`, error);
    return NextResponse.json(
      { error: 'Failed to download APK from storage' },
      { status: 500 }
    );
  }
}
