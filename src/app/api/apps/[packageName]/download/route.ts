import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';
import { nasDownload } from '@/lib/nasStorage';
import { getUserFromRequest, canUserAccessApp } from '@/lib/userAuth';
import { buildDirectDownloadUrl } from '@/lib/storageApi';
import { getDownloadKey, getDownloadUrl } from '@/lib/settings';

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
        baseUrl: (await getDownloadUrl()) || undefined,
      });
      if (directDownloadUrl.startsWith('https://')) {
        return NextResponse.redirect(directDownloadUrl, 307);
      }
    }

    // Streamelt letöltés a NAS letöltő API-n keresztül (a Range fejléc átadódik, így a megszakított
    // letöltés folytatható; nincs memóriába töltés).
    const upstream = await nasDownload(app.apkWebDavPath, req.headers.get('range'));

    const headers: Record<string, string> = {
      'Content-Type': 'application/vnd.android.package-archive',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      'Content-Disposition': `attachment; filename="${safeFileBase}-v${app.versionCode}.apk"`,
    };
    for (const h of ['content-length', 'content-range']) {
      const v = upstream.headers.get(h);
      if (v) headers[h] = v;
    }

    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (error: any) {
    console.error(`Error streaming APK download for ${packageName}:`, error);
    return NextResponse.json(
      { error: 'Failed to download APK from storage' },
      { status: 500 }
    );
  }
}
