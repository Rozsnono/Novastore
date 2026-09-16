import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';
import { deleteWebDAVPath, getAppStoragePath } from '@/lib/webdav';
import mediaCache from '@/lib/cache';

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

    const updated = await AppItem.findByIdAndUpdate(
      id,
      {
        ...body,
        ...(newVersionCode !== undefined ? { versionCode: newVersionCode } : {}),
        ...(isVersionChange ? { isUpdated: true } : {}),
      },
      { new: true, runValidators: true }
    );

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

    // Purge app folder from WebDAV NAS
    const appNasPath = getAppStoragePath(app.packageName);
    await deleteWebDAVPath(appNasPath);

    // Invalidate media cache
    mediaCache.invalidate(`icon_${app.packageName}`);
    mediaCache.invalidate(`screenshot_${app.packageName}`);

    return NextResponse.json({
      success: true,
      message: `App ${app.title} (${app.packageName}) and all WebDAV files permanently deleted.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
