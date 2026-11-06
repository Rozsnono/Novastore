import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { isAtRestEncryptionConfigured } from '@/lib/secretBox';
import {
  SECRET_NAMES,
  SecretName,
  TEXT_NAMES,
  TextName,
  clearSecret,
  clearText,
  getSecretStatuses,
  getTextStatuses,
  setSecret,
  setText,
} from '@/lib/settings';

export const dynamic = 'force-dynamic';

/**
 * GET: a beállítások állapota. A titkos kulcsoknál csak az állapot és az utolsó 4 karakter jelenik meg
 * (az érték soha); a nem titkos szolgáltatás URL-ek értéke látszik.
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
        texts: await getTextStatuses(),
      },
    });
  } catch (error: any) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'A beállítások betöltése nem sikerült' }, { status: 500 });
  }
}

/**
 * PUT: beállítások mentése. Törzs: { uploadUrl?, downloadUrl?, uploadKey?, downloadKey?, clientSecret? }.
 * Üres vagy hiányzó mező = változatlan. A kulcsok titkosítva kerülnek az adatbázisba.
 */
export async function PUT(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: 'Nincs jogosultság' }, { status: 401 });

  try {
    const body = await req.json();
    const secretsToSave = SECRET_NAMES.filter((n) => typeof body?.[n] === 'string' && body[n].trim());
    const textsToSave = TEXT_NAMES.filter((n) => typeof body?.[n] === 'string' && body[n].trim());

    // Csak a titkos kulcsok mentéséhez kell a titkosító mesterkulcs; az URL-ek nem titkosak.
    if (secretsToSave.length > 0 && !isAtRestEncryptionConfigured()) {
      return NextResponse.json(
        {
          error:
            'A SETTINGS_ENCRYPTION_KEY környezeti változó nincs beállítva (legalább 32 karakter). ' +
            'Add meg a .env.local fájlban, indítsd újra a szervert, majd próbáld újra.',
        },
        { status: 503 }
      );
    }

    const saved: string[] = [];
    for (const name of textsToSave) {
      await setText(name, body[name]);
      saved.push(name);
    }
    for (const name of secretsToSave) {
      await setSecret(name, body[name]);
      saved.push(name);
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

  const name = req.nextUrl.searchParams.get('name');
  const isSecret = SECRET_NAMES.includes(name as SecretName);
  const isText = TEXT_NAMES.includes(name as TextName);
  if (!name || (!isSecret && !isText)) {
    return NextResponse.json({ error: 'Ismeretlen beállítás' }, { status: 400 });
  }
  try {
    if (isSecret) await clearSecret(name as SecretName);
    else await clearText(name as TextName);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Settings DELETE error:', error);
    return NextResponse.json({ error: 'A törlés nem sikerült' }, { status: 500 });
  }
}
