import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getUploadKey, getUploadUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/**
 * A böngészős feltöltő (ChunkedUploader) konfigurációja: feltöltő szolgáltatás URL és kulcs.
 * Csak bejelentkezett adminnak adjuk ki, így a kulcs nem kerül a publikus JavaScript csomagba.
 */
export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Nincs jogosultság' }, { status: 401 });

  try {
    const apiKey = await getUploadKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'A feltöltő API kulcs nincs beállítva. Add meg a Beállítások oldalon.' },
        { status: 503 }
      );
    }
    const apiUrl = await getUploadUrl();
    if (!apiUrl) {
      return NextResponse.json(
        { error: 'A feltöltő szolgáltatás URL-je nincs beállítva. Add meg a Beállítások oldalon.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ success: true, data: { apiUrl, apiKey } });
  } catch (error: any) {
    console.error('Upload config error:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'A feltöltési konfiguráció nem érhető el' }, { status: 500 });
  }
}
