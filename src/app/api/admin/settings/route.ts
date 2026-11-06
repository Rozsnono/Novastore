import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { isAtRestEncryptionConfigured } from '@/lib/secretBox';
import {
  SECRET_NAMES,
  SecretName,
  clearSecret,
  getSecretStatuses,
  setSecret,
} from '@/lib/settings';

export const dynamic = 'force-dynamic';

/**
 * GET: a titkos beállítások ÁLLAPOTA (beállítva-e, forrás, utolsó 4 karakter).
 * A kulcsok értéke soha nem kerül a válaszba.
 */
export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Nincs jogosultság' }, { status: 401 });

  try {
    return NextResponse.json({
      success: true,
      data: {
        encryptionConfigured: isAtRestEncryptionConfigured(),
        secrets: await getSecretStatuses(),
      },
    });
  } catch (error: any) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'A beállítások betöltése nem sikerült' }, { status: 500 });
  }
}

/**
 * PUT: kulcsok mentése. Törzs: { uploadKey?, downloadKey?, clientSecret? }.
 * Üres vagy hiányzó mező = változatlan. Az érték titkosítva kerül az adatbázisba.
 */
export async function PUT(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Nincs jogosultság' }, { status: 401 });

  if (!isAtRestEncryptionConfigured()) {
    return NextResponse.json(
      {
        error:
          'A SETTINGS_ENCRYPTION_KEY környezeti változó nincs beállítva (legalább 32 karakter). ' +
          'Add meg a .env.local fájlban, indítsd újra a szervert, majd próbáld újra.',
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const saved: SecretName[] = [];
    for (const name of SECRET_NAMES) {
      const value = body?.[name];
      if (typeof value === 'string' && value.trim()) {
        await setSecret(name, value);
        saved.push(name);
      }
    }
    console.info(`Admin beállítások mentve: ${saved.join(', ') || '(nincs változás)'}`);
    return NextResponse.json({ success: true, saved });
  } catch (error: any) {
    console.error('Settings PUT error:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'A mentés nem sikerült' }, { status: 400 });
  }
}

/** DELETE ?name=uploadKey: az adatbázisban tárolt érték törlése (a környezeti tartalék marad). */
export async function DELETE(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Nincs jogosultság' }, { status: 401 });

  const name = req.nextUrl.searchParams.get('name') as SecretName | null;
  if (!name || !SECRET_NAMES.includes(name)) {
    return NextResponse.json({ error: 'Ismeretlen beállítás' }, { status: 400 });
  }
  try {
    await clearSecret(name);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Settings DELETE error:', error);
    return NextResponse.json({ error: 'A törlés nem sikerült' }, { status: 500 });
  }
}
