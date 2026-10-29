import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Az uploadId a fájlrendszer-útvonal része: csak biztonságos karakterek engedélyezettek.
const SAFE_UPLOAD_ID = /^[A-Za-z0-9_-]{1,128}$/;

export const dynamic = 'force-dynamic';

// Maximális szeletméret (a kliens 20 MB-os szeleteket küld) és az elhagyott feltöltések élettartama
const MAX_CHUNK_BYTES = 50 * 1024 * 1024;
const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000;

/**
 * Az elhagyott (24 óránál régebbi) staging mappák törlése, hogy a temp könyvtár ne teljen meg.
 * Hiba esetén csak naplóz, a feltöltést nem akasztja meg.
 */
function cleanupStaleUploads(root: string): void {
  try {
    if (!fs.existsSync(root)) return;
    const now = Date.now();
    for (const entry of fs.readdirSync(root)) {
      const dir = path.join(root, entry);
      try {
        if (now - fs.statSync(dir).mtimeMs > STALE_UPLOAD_MS) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      } catch (e) {
        console.warn('Failed to remove stale upload dir:', dir, e);
      }
    }
  } catch (e) {
    console.warn('Stale upload cleanup failed:', e);
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const uploadId = formData.get('uploadId') as string;
    const chunkIndexStr = formData.get('chunkIndex') as string;
    const chunkFile = formData.get('chunk') as File | null;

    if (!uploadId || chunkIndexStr === undefined || !chunkFile) {
      return NextResponse.json(
        { error: 'Missing required upload parameters' },
        { status: 400 }
      );
    }

    if (!SAFE_UPLOAD_ID.test(uploadId)) {
      return NextResponse.json({ error: 'Invalid uploadId' }, { status: 400 });
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
      return NextResponse.json({ error: 'Invalid chunkIndex' }, { status: 400 });
    }
    if (chunkFile.size > MAX_CHUNK_BYTES) {
      return NextResponse.json({ error: 'Chunk too large' }, { status: 413 });
    }

    const uploadsRoot = path.join(os.tmpdir(), 'novastore_uploads');
    cleanupStaleUploads(uploadsRoot);
    const stagingDir = path.join(uploadsRoot, uploadId);

    if (!fs.existsSync(stagingDir)) {
      fs.mkdirSync(stagingDir, { recursive: true });
    }

    const chunkFilePath = path.join(stagingDir, `chunk_${chunkIndex}`);
    const arrayBuffer = await chunkFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(chunkFilePath, buffer);

    return NextResponse.json({
      success: true,
      chunkIndex,
      bytesReceived: buffer.length,
    });
  } catch (error: any) {
    console.error('Error saving upload chunk:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save chunk' },
      { status: 500 }
    );
  }
}
