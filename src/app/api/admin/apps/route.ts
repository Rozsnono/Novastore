import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import AppItem from '@/lib/models/AppItem';
import { enforceMaxApkRetention } from '@/lib/webdav';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const apps = await AppItem.find().sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: apps });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      title,
      packageName,
      versionCode,
      versionName,
      description,
      iconUrl,
      screenshots,
      apkWebDavPath,
      sizeBytes,
    } = body;

    if (
      !title ||
      !packageName ||
      !versionCode ||
      !versionName ||
      !description ||
      !iconUrl ||
      !apkWebDavPath
    ) {
      return NextResponse.json(
        { error: 'Please provide all required application fields' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check for existing packageName
    const existing = await AppItem.findOne({ packageName: packageName.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json(
        { error: `App with package name "${packageName}" already exists` },
        { status: 409 }
      );
    }

    const newApp = await AppItem.create({
      title: title.trim(),
      packageName: packageName.toLowerCase().trim(),
      versionCode: Number(versionCode),
      versionName: versionName.trim(),
      description: description.trim(),
      iconUrl,
      screenshots: Array.isArray(screenshots) ? screenshots : [],
      apkWebDavPath,
      sizeBytes: Number(sizeBytes) || 0,
      downloadCount: 0,
      isUpdated: false,
    });

    // Enforce max 3 APK retention on NAS
    try {
      await enforceMaxApkRetention(newApp.packageName, 3);
    } catch (retentionErr) {
      console.warn(`[NAS Retention] Failed to enforce retention for ${newApp.packageName}:`, retentionErr);
    }

    return NextResponse.json({ success: true, data: newApp }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating app:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create application' },
      { status: 500 }
    );
  }
}
