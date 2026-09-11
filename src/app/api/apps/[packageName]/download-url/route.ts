import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';
import { getUserFromRequest, canUserAccessApp } from '@/lib/userAuth';
import { buildDirectDownloadUrl } from '@/lib/storageApi';

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

    const user = await getUserFromRequest(req);
    const access = canUserAccessApp(user, app);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason || 'Hozzáférés megtagadva ehhez az alkalmazáshoz' },
        { status: 403 }
      );
    }

    const directDownloadUrl = buildDirectDownloadUrl(app.apkWebDavPath);
    const fileName = `${packageName}-v${app.versionCode}.apk`;

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
      { error: error.message || 'Failed to resolve download URL' },
      { status: 500 }
    );
  }
}
