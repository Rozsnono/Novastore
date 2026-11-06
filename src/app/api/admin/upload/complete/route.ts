import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { manageApkVersioningFromChunks } from '@/lib/nasStorage';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Az uploadId a fájlrendszer-útvonal része: csak biztonságos karakterek engedélyezettek.
const SAFE_UPLOAD_ID = /^[A-Za-z0-9_-]{1,128}$/;

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

    if (typeof uploadId !== 'string' || !SAFE_UPLOAD_ID.test(uploadId)) {
      return NextResponse.json({ error: 'Invalid uploadId' }, { status: 400 });
    }

    // Ezek a értékek a NAS-útvonalba és a ciklusba kerülnek, ezért szigorúan ellenőrizzük őket
    const versionCodeNum = Number(versionCode);
    if (!Number.isInteger(versionCodeNum) || versionCodeNum < 1) {
      return NextResponse.json({ error: 'Invalid versionCode' }, { status: 400 });
    }
    const totalChunksNum = Number(totalChunks);
    if (!Number.isInteger(totalChunksNum) || totalChunksNum < 1 || totalChunksNum > 5000) {
      return NextResponse.json({ error: 'Invalid totalChunks' }, { status: 400 });
    }
    if (typeof packageName !== 'string') {
      return NextResponse.json({ error: 'Invalid packageName' }, { status: 400 });
    }

    const stagingDir = path.join(os.tmpdir(), 'novastore_uploads', uploadId);

    if (!fs.existsSync(stagingDir)) {
      return NextResponse.json(
        { error: 'Upload session expired or chunks not found' },
        { status: 404 }
      );
    }

    // Verify all chunks exist
    const chunkPaths: string[] = [];
    for (let i = 0; i < totalChunksNum; i++) {
      const chunkFilePath = path.join(stagingDir, `chunk_${i}`);
      if (!fs.existsSync(chunkFilePath)) {
        return NextResponse.json(
          { error: `Missing chunk ${i} of ${totalChunksNum}` },
          { status: 400 }
        );
      }
      chunkPaths.push(chunkFilePath);
    }


    // Feltöltés és verziókezelés a NAS tároló API-n keresztül
    const { finalPath, sizeBytes } = await manageApkVersioningFromChunks(
      packageName.toLowerCase().trim(),
      versionCodeNum,
      chunkPaths
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
