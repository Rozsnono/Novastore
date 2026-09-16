import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';
import { UpdateCheckRequest } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body: UpdateCheckRequest = await req.json();
    const { packages } = body;

    if (!Array.isArray(packages) || packages.length === 0) {
      return NextResponse.json({ success: true, updates: [] });
    }

    await connectToDatabase();

    const packageNames = packages.map((p) => p.packageName.toLowerCase().trim());
    const storeApps = await AppItem.find({
      packageName: { $in: packageNames },
    });

    const updates = [];

    for (const userPkg of packages) {
      const storeApp = storeApps.find(
        (app) => app.packageName.toLowerCase() === userPkg.packageName.toLowerCase()
      );

      if (storeApp && storeApp.versionCode > userPkg.versionCode) {
        updates.push({
          packageName: storeApp.packageName,
          currentVersionCode: userPkg.versionCode,
          latestVersionCode: storeApp.versionCode,
          latestVersionName: storeApp.versionName,
          title: storeApp.title,
          description: storeApp.description,
          iconUrl: storeApp.iconUrl,
          sizeBytes: storeApp.sizeBytes,
          apkDownloadUrl: `/api/apps/${storeApp.packageName}/download`,
          updatedAt: storeApp.updatedAt,
        });
      }
    }

    return NextResponse.json({
      success: true,
      updates,
    });
  } catch (error: any) {
    console.error('Error checking updates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check updates' },
      { status: 500 }
    );
  }
}
