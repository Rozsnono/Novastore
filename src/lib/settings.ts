/**
 * ==============================================================================
 * Titkos beállítások (API kulcsok) kezelése
 * ==============================================================================
 *
 * Az admin felületen megadott kulcsok titkosítva a MongoDB `settings` gyűjteményében élnek.
 * Olvasáskor sorrend: 1. adatbázis (admin által megadott) → 2. környezeti változó (tartalék).
 * Így a meglévő .env.local alapú telepítések változtatás nélkül tovább működnek.
 *
 * Kulcsok:
 *  - uploadKey:    feltöltő API kulcs (az admin felület feltöltője használja)
 *  - downloadKey:  letöltő API kulcs (ezt kapja meg titkosítva a telefon); ha nincs külön megadva,
 *                  a feltöltő kulcsra esik vissza (a korábbi viselkedés)
 *  - clientSecret: az app és a szerver közös titka a telefonnak küldött titkosításhoz
 */

import { connectToDatabase } from './db';
import Setting from './models/Setting';
import { decryptAtRest, encryptAtRest, isAtRestEncryptionConfigured } from './secretBox';

export type SecretName = 'uploadKey' | 'downloadKey' | 'clientSecret';

export const SECRET_NAMES: SecretName[] = ['uploadKey', 'downloadKey', 'clientSecret'];

/** Az egyes beállítások DB kulcsa és a tartalékként használt környezeti változók. */
const DEFINITIONS: Record<SecretName, { dbKey: string; envVars: string[] }> = {
  uploadKey: { dbKey: 'storage.uploadKey', envVars: ['UPLOAD_API_KEY', 'NEXT_PUBLIC_UPLOAD_API_KEY'] },
  downloadKey: { dbKey: 'storage.downloadKey', envVars: [] },
  clientSecret: { dbKey: 'app.clientSecret', envVars: ['APP_CLIENT_SECRET'] },
};

/** Rövid ideig gyorsítótárazunk, hogy minden letöltési kérésnél ne kelljen DB-t olvasni. */
const CACHE_TTL_MS = 30_000;
const cache = new Map<SecretName, { value: string | null; source: SecretSource; at: number }>();

export type SecretSource = 'db' | 'env' | 'none';

function readEnv(names: string[]): string | null {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return null;
}

/** Egy titok feloldása (DB → env), a forrás megjelölésével. Hiba esetén naplóz és env-re esik vissza. */
async function resolveSecret(name: SecretName): Promise<{ value: string | null; source: SecretSource }> {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { value: hit.value, source: hit.source };

  const def = DEFINITIONS[name];
  let result: { value: string | null; source: SecretSource } = { value: null, source: 'none' };

  try {
    if (isAtRestEncryptionConfigured()) {
      await connectToDatabase();
      const doc = await Setting.findOne({ key: def.dbKey }).lean();
      if (doc?.valueEnc) {
        result = { value: decryptAtRest(doc.valueEnc), source: 'db' };
      }
    }
  } catch (err: any) {
    // A kulcs értéke soha nem kerül a naplóba, csak a hiba oka.
    console.error(`Beállítás (${name}) olvasási hiba, környezeti tartalékra váltok:`, err?.message || err);
  }

  if (!result.value) {
    const envValue = readEnv(def.envVars);
    if (envValue) result = { value: envValue, source: 'env' };
  }

  cache.set(name, { ...result, at: Date.now() });
  return result;
}

/** Feltöltő API kulcs (hiány esetén null). */
export async function getUploadKey(): Promise<string | null> {
  return (await resolveSecret('uploadKey')).value;
}

/** Letöltő API kulcs; külön megadott hiányában a feltöltő kulcs (korábbi viselkedés). */
export async function getDownloadKey(): Promise<string | null> {
  const dl = await resolveSecret('downloadKey');
  return dl.value ?? (await resolveSecret('uploadKey')).value;
}

/** Az app–szerver közös titok a telefonnak küldött titkosításhoz (hiány esetén null). */
export async function getClientSecret(): Promise<string | null> {
  return (await resolveSecret('clientSecret')).value;
}

/** Egy titok állapota az admin felületnek: a kulcs értéke SOHA nem hagyja el a szervert. */
export interface SecretStatus {
  name: SecretName;
  configured: boolean;
  source: SecretSource;
  /** Az érték utolsó 4 karaktere azonosításhoz (csak ha legalább 12 karakteres). */
  hint: string | null;
  updatedAt: string | null;
}

export async function getSecretStatuses(): Promise<SecretStatus[]> {
  const out: SecretStatus[] = [];
  for (const name of SECRET_NAMES) {
    const { value, source } = await resolveSecret(name);
    let updatedAt: string | null = null;
    if (source === 'db') {
      try {
        const doc = await Setting.findOne({ key: DEFINITIONS[name].dbKey }).lean();
        updatedAt = doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null;
      } catch {
        updatedAt = null;
      }
    }
    out.push({
      name,
      configured: Boolean(value),
      source,
      hint: value && value.length >= 12 ? `…${value.slice(-4)}` : null,
      updatedAt,
    });
  }
  return out;
}

/** Titok mentése titkosítva. A mesterkulcs hiányában érthető hibát dob. */
export async function setSecret(name: SecretName, value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Az érték nem lehet üres.');
  if (trimmed.length > 512) throw new Error('Az érték túl hosszú (legfeljebb 512 karakter).');
  const valueEnc = encryptAtRest(trimmed); // hibát dob, ha nincs SETTINGS_ENCRYPTION_KEY
  await connectToDatabase();
  await Setting.findOneAndUpdate(
    { key: DEFINITIONS[name].dbKey },
    { valueEnc },
    { upsert: true, new: true }
  );
  cache.delete(name);
}

/** Az adatbázisban tárolt érték törlése (utána a környezeti tartalék érvényes). */
export async function clearSecret(name: SecretName): Promise<void> {
  await connectToDatabase();
  await Setting.deleteOne({ key: DEFINITIONS[name].dbKey });
  cache.delete(name);
}
