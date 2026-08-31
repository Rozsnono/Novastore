import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
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

    const chunkIndex = parseInt(chunkIndexStr, 10);
    const stagingDir = path.join(os.tmpdir(), 'novastore_uploads', uploadId);

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
