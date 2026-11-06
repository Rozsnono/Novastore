import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';
import { getUserFromRequest, canUserAccessApp } from '@/lib/userAuth';
import { buildDirectDownloadUrl } from '@/lib/storageApi';
import { getClientSecret, getDownloadKey, getDownloadUrl } from '@/lib/settings';
import { encryptForClient } from '@/lib/secretBox';

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

    const user = await getUserFromRequest(req, true);
    const access = canUserAccessApp(user, app);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason || 'Hozzáférés megtagadva ehhez az alkalmazáshoz' },
        { status: 403 }
      );
    }

    const fileName = `${packageName}-v${app.versionCode}.apk`;
    const downloadKey = await getDownloadKey();
    const baseUrl = (await getDownloadUrl()) || undefined;
    const nonce = req.headers.get('x-nova-nonce');

    // Új kliensek (x-nova-nonce fejléc): a letöltési kulcs NEM szerepel az URL-ben, hanem
    // titkosítva (AES-256-GCM) érkezik; a kulcsot az app a nonce-ból és a közös titokból származtatja.
    if (nonce) {
      const clientSecret = await getClientSecret();
      if (!downloadKey || !clientSecret) {
        console.error('Titkosított letöltési kulcs nem adható ki: letöltési kulcs vagy app-titok hiányzik.');
        return NextResponse.json(
          { error: 'A letöltés jelenleg nem érhető el (a szerver kulcsai nincsenek beállítva).' },
          { status: 503 }
        );
      }
      let envelope;
      try {
        envelope = encryptForClient(downloadKey, clientSecret, nonce, app.packageName);
      } catch (e: any) {
        return NextResponse.json({ error: 'Érvénytelen titkosítási kérés.' }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        downloadUrl: buildDirectDownloadUrl(app.apkWebDavPath, { omitKey: true, baseUrl }),
        encryptedKey: envelope,
        fileName,
        totalBytes: Number(app.sizeBytes) || 0,
        versionCode: app.versionCode,
        versionName: app.versionName,
      });
    }

    // Régi kliensek (visszafelé kompatibilitás): a kulcs az URL-ben utazik, mint korábban.
    const directDownloadUrl = buildDirectDownloadUrl(app.apkWebDavPath, {
      apiKey: downloadKey || undefined,
      baseUrl,
    });

    return NextResponse.json({
      success: true,
      downloadUrl: directDownloadUrl,
      fileName,
      totalBytes: Number(app.sizeBytes) || 0,
      versionCode: app.versionCode,
      versionName: app.versionName,
    });
  } catch (error: any) {
    console.error(`Error resolving download URL for ${packageName}:`, error);
    return NextResponse.json(
      { error: 'Failed to resolve download URL' },
      { status: 500 }
    );
  }
}
