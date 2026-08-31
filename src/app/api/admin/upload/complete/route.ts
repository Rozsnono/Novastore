import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { manageApkVersioning } from '@/lib/webdav';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      uploadId,
      totalChunks,
      packageName,
      versionCode,
    } = await req.json();

    if (!uploadId || !totalChunks || !packageName || !versionCode) {
      return NextResponse.json(
        { error: 'Missing required parameters for assembly' },
        { status: 400 }
      );
    }

    const stagingDir = path.join(os.tmpdir(), 'novastore_uploads', uploadId);

    if (!fs.existsSync(stagingDir)) {
      return NextResponse.json(
        { error: 'Upload session expired or chunks not found' },
        { status: 404 }
      );
    }

    // Verify all chunks exist
    const chunkBuffers: Buffer[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkFilePath = path.join(stagingDir, `chunk_${i}`);
      if (!fs.existsSync(chunkFilePath)) {
        return NextResponse.json(
          { error: `Missing chunk ${i} of ${totalChunks}` },
          { status: 400 }
        );
      }
      chunkBuffers.push(fs.readFileSync(chunkFilePath));
    }

    // Concatenate all chunks
    const completeApkBuffer = Buffer.concat(chunkBuffers);

    // Upload & version manage on WebDAV NAS
    const { finalPath, sizeBytes } = await manageApkVersioning(
      packageName,
      versionCode,
      completeApkBuffer
    );

    // Clean up temporary staging directory
    try {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.warn('Failed to cleanup staging directory:', cleanupErr);
    }

    return NextResponse.json({
      success: true,
      apkWebDavPath: finalPath,
      sizeBytes,
    });
  } catch (error: any) {
    console.error('Error assembling chunks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assemble and upload APK to NAS' },
      { status: 500 }
    );
  }
}
