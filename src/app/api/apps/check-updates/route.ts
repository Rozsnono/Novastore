import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';
import { UpdateCheckRequest } from '@/types';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!checkRateLimit(`check-updates:${getClientIp(req)}`, 120, 60000)) {
    return NextResponse.json({ error: 'Túl sok kérés. Próbáld újra később.' }, { status: 429 });
  }

  try {
    const body: UpdateCheckRequest = await req.json();
    const rawPackages = body?.packages;

    if (!Array.isArray(rawPackages) || rawPackages.length === 0) {
      return NextResponse.json({ success: true, updates: [] });
    }

    // Hibás elemek kiszűrése (hiányzó/nem szöveges csomagnév → korábban 500 volt) és méretkorlát
    const packages = rawPackages
      .slice(0, 200)
      .filter(
        (p) =>
          p &&
          typeof p.packageName === 'string' &&
          p.packageName.trim() &&
          typeof p.versionCode === 'number'
      );

    if (packages.length === 0) {
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
      { error: 'Failed to check updates' },
      { status: 500 }
    );
  }
}
