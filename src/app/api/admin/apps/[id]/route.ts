import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';
import { nasDelete, getAppStoragePath, enforceMaxApkRetention, apkDirFromPath } from '@/lib/nasStorage';
import mediaCache from '@/lib/cache';
import Review from '@/lib/models/Review';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await connectToDatabase();
    const app = await AppItem.findById(id);
    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: app });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await req.json();
    await connectToDatabase();

    const existingApp = await AppItem.findById(id);
    if (!existingApp) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    const newVersionCode =
      body.versionCode !== undefined && body.versionCode !== null && body.versionCode !== ''
        ? Number(body.versionCode)
        : undefined;

    const isVersionChange =
      newVersionCode !== undefined && newVersionCode > existingApp.versionCode;

    // Mass assignment ellen: csak a szerkeszthető mezőket engedjük át
    // (packageName, downloadCount, értékelési statisztika stb. nem módosítható).
    const EDITABLE_FIELDS = [
      'title',
      'versionName',
      'description',
      'iconUrl',
      'screenshots',
      'apkWebDavPath',
      'sizeBytes',
      'isUpdated',
      'accessLevel',
      'requiredRoles',
      'requiredPermissions',
    ];
    const editable: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (body && body[key] !== undefined) editable[key] = body[key];
    }

    if (newVersionCode !== undefined && !Number.isFinite(newVersionCode)) {
      return NextResponse.json({ error: 'Invalid versionCode' }, { status: 400 });
    }

    const updated = await AppItem.findByIdAndUpdate(
      id,
      {
        ...editable,
        ...(newVersionCode !== undefined ? { versionCode: newVersionCode } : {}),
        ...(isVersionChange ? { isUpdated: true } : {}),
      },
      { new: true, runValidators: true }
    );

    // Enforce max 3 APK retention on NAS
    if (updated?.packageName) {
      try {
        await enforceMaxApkRetention(updated.packageName, 3, apkDirFromPath(updated.apkWebDavPath));
      } catch (retentionErr) {
        console.warn(`[NAS Retention] Failed to enforce retention for ${updated.packageName}:`, retentionErr);
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await connectToDatabase();
    const app = await AppItem.findByIdAndDelete(id);
    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    // Az alkalmazás értékelései sem maradhatnak árván
    await Review.deleteMany({ packageName: app.packageName });

    // Az app mappájának törlése a NAS-ról (tároló API). Hiba esetén naplózunk, de a DB-bejegyzés törlése folytatódik.
    const appNasPath = getAppStoragePath(app.packageName);
    try {
      await nasDelete(appNasPath, true);
    } catch (nasErr) {
      console.error(`A NAS mappa törlése nem sikerült (${appNasPath}):`, nasErr);
    }

    // Invalidate media cache
    mediaCache.invalidate(`icon_${app.packageName}`);
    mediaCache.invalidate(`screenshot_${app.packageName}`);

    return NextResponse.json({
      success: true,
      message: `App ${app.title} (${app.packageName}) and all NAS files permanently deleted.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
