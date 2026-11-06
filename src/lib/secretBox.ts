/**
 * ==============================================================================
 * Titkosító segédfüggvények (AES-256-GCM)
 * ==============================================================================
 *
 * Két célra:
 *  1. Nyugalmi titkosítás: az admin felületen megadott API kulcsok titkosítva kerülnek
 *     az adatbázisba (`encryptAtRest` / `decryptAtRest`). A mesterkulcs a
 *     `SETTINGS_ENCRYPTION_KEY` környezeti változó (tetszőleges, legalább 32 karakteres titok).
 *  2. Átvitel a mobilalkalmazásnak: a letöltési kulcsot minden kérésnél új IV-vel,
 *     az app által küldött nonce-ból és a közös app-titokból származtatott kulccsal
 *     titkosítjuk (`encryptForClient`). Az app ugyanígy származtatja a kulcsot.
 *
 * A függvények soha nem naplózzák a nyílt szöveget vagy a kulcsokat.
 */

import { createCipheriv, createDecipheriv, createHmac, randomBytes, createHash } from 'crypto';

/** A tárolt titkosított érték formátum-előtagja (verziózás a későbbi változtatásokhoz). */
const AT_REST_PREFIX = 'v1';

/** A nyugalmi titkosítás mesterkulcsa: SHA-256 a környezeti titokból (32 bájt). */
function getMasterKey(): Buffer {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      'Hiányzó konfiguráció: a SETTINGS_ENCRYPTION_KEY nincs beállítva vagy rövidebb 32 karakternél. ' +
        'Add meg a .env.local fájlban, majd indítsd újra a szervert.'
    );
  }
  return createHash('sha256').update(secret.trim()).digest();
}

/** Jelzi, hogy a nyugalmi titkosítás használható-e (a mesterkulcs be van állítva). */
export function isAtRestEncryptionConfigured(): boolean {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY;
  return Boolean(secret && secret.trim().length >= 32);
}

/** Szöveg titkosítása tároláshoz. Formátum: `v1:<iv>:<tag>:<adat>` (base64). */
export function encryptAtRest(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getMasterKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [AT_REST_PREFIX, iv.toString('base64'), tag.toString('base64'), data.toString('base64')].join(':');
}

/** Tárolt érték visszafejtése. Hibás formátum vagy rossz mesterkulcs esetén hibát dob. */
export function decryptAtRest(stored: string): string {
  const [prefix, ivB64, tagB64, dataB64] = stored.split(':');
  if (prefix !== AT_REST_PREFIX || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('A tárolt érték formátuma ismeretlen.');
  }
  const decipher = createDecipheriv('aes-256-gcm', getMasterKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const data = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return data.toString('utf8');
}

/** A mobilnak küldött titkosított csomag (minden mező base64). */
export interface ClientEnvelope {
  v: 1;
  iv: string;
  tag: string;
  data: string;
}

/**
 * Kulcs származtatása az átvitelhez: HMAC-SHA256(appTitok, nonce || "|" || csomagnév).
 * Az app azonos módon számolja (lásd novastore-app/src/services/secureKey.ts).
 */
function deriveClientKey(clientSecret: string, nonce: Buffer, packageName: string): Buffer {
  return createHmac('sha256', clientSecret)
    .update(Buffer.concat([nonce, Buffer.from(`|${packageName}`, 'utf8')]))
    .digest();
}

/**
 * Titkos érték (pl. letöltési API kulcs) titkosítása a mobilalkalmazásnak.
 * Minden kérésnél új véletlen IV; a csomagnév AAD-ként köti a választ az adott apphoz.
 */
export function encryptForClient(
  secretValue: string,
  clientSecret: string,
  nonceB64: string,
  packageName: string
): ClientEnvelope {
  const nonce = Buffer.from(nonceB64, 'base64');
  if (nonce.length < 12 || nonce.length > 64) {
    throw new Error('Érvénytelen nonce hossz.');
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveClientKey(clientSecret, nonce, packageName), iv);
  cipher.setAAD(Buffer.from(packageName, 'utf8'));
  const data = Buffer.concat([cipher.update(secretValue, 'utf8'), cipher.final()]);
  return {
    v: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  };
}
