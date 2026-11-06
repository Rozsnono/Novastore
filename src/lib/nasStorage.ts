/**
 * ==============================================================================
 * NAS tároló kliens – KIZÁRÓLAG a dedikált feltöltő/letöltő szolgáltatás API-ján keresztül
 * ==============================================================================
 *
 * A NovaStore szerver nem használ közvetlen WebDAV kapcsolatot: minden fájlművelet
 * (feltöltés, letöltés, méret lekérdezés, listázás, törlés) a szolgáltatás HTTP API-ját hívja
 * (`/upload/*`, `/download`, `/download/info`, `/download/list`, `DELETE /files`).
 *
 * Az URL-ek és API kulcsok az admin Beállítások oldalról jönnek (lib/settings.ts), env tartalékkal.
 *  - írás/törlés: feltöltési URL + feltöltési kulcs
 *  - olvasás (letöltés, info, lista): letöltési URL + letöltési kulcs (hiányában a feltöltési)
 *
 * Útvonalak: a szolgáltatás a "/"-lel kezdődő útvonalat abszolútnak veszi (lásd storageApi.ts
 * toStorageApiPath), ezért minden útvonalat azon keresztül küldünk.
 */

import fs from 'fs';
import { getDownloadKey, getDownloadUrl, getUploadKey, getUploadUrl } from './settings';
import { toStorageApiPath } from './storageApi';

/** Az appok könyvtára a tárolón (kulcs mappájához / feltöltési gyökérhez képest). */
const APPS_DIR = (process.env.APPS_STORAGE_DIR || process.env.WEBDAV_ROOT_PATH || '/novastore/apps').replace(/\/$/, '');

/** Egy apphoz tartozó könyvtár a tárolón. */
export function getAppStoragePath(packageName: string): string {
  const sanitizedPackage = packageName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${APPS_DIR}/${sanitizedPackage}`;
}

/** A tárolón lévő fájl/mappa leírása (a /download/info és /download/list válaszaiból). */
export interface NasItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  lastModified: string | null;
}

type Access = 'read' | 'write';

/** Alap URL és kulcs a művelet fajtája szerint; hiány esetén érthető hibát dob. */
async function resolveAccess(access: Access): Promise<{ baseUrl: string; key: string }> {
  const baseUrl = access === 'write' ? await getUploadUrl() : await getDownloadUrl();
  const key = access === 'write' ? await getUploadKey() : await getDownloadKey();
  if (!baseUrl) {
    throw new Error(
      `A NAS ${access === 'write' ? 'feltöltő' : 'letöltő'} szolgáltatás URL-je nincs beállítva (Beállítások oldal).`
    );
  }
  if (!key) {
    throw new Error(
      `A NAS ${access === 'write' ? 'feltöltési' : 'letöltési'} API kulcs nincs beállítva (Beállítások oldal).`
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ''), key };
}

/** Hívás a szolgáltatás API-jára. A kulcs fejlécben megy, soha nem az URL-ben, és nem kerül naplóba. */
async function nasFetch(
  access: Access,
  pathAndQuery: string,
  init: RequestInit & { headers?: Record<string, string> } = {}
): Promise<Response> {
  const { baseUrl, key } = await resolveAccess(access);
  return fetch(`${baseUrl}${pathAndQuery}`, {
    ...init,
    headers: { ...(init.headers || {}), 'x-api-key': key },
    cache: 'no-store',
  });
}

/** A szolgáltatás hibaválaszából érthető üzenet. */
async function describeError(res: Response, what: string): Promise<string> {
  let detail = '';
  try {
    const json = await res.clone().json();
    detail = json?.error || json?.message || '';
  } catch {
    /* nem JSON válasz */
  }
  return `${what} (HTTP ${res.status}${detail ? `: ${detail}` : ''})`;
}

/* ------------------------------------------------------------------ */
/* Olvasás                                                             */
/* ------------------------------------------------------------------ */

/** Fájl metaadatai (méret, módosítás). Nem létező fájlnál hibát dob. */
export async function nasStat(path: string): Promise<NasItem> {
  const res = await nasFetch('read', `/download/info?path=${encodeURIComponent(toStorageApiPath(path))}`);
  if (!res.ok) throw new Error(await describeError(res, 'A fájl adatai nem kérdezhetők le'));
  const json = await res.json();
  const f = json.file || {};
  return {
    name: f.filename || '',
    path: f.path || path,
    type: f.type === 'directory' ? 'directory' : 'file',
    size: Number(f.size) || 0,
    lastModified: f.lastModified || null,
  };
}

/** Könyvtár tartalma. Nem létező könyvtárnál hibát dob. */
export async function nasList(dir: string): Promise<NasItem[]> {
  const res = await nasFetch('read', `/download/list?path=${encodeURIComponent(toStorageApiPath(dir))}`);
  if (!res.ok) throw new Error(await describeError(res, 'A könyvtár nem listázható'));
  const json = await res.json();
  return (json.items || []).map((i: any) => ({
    name: String(i.name),
    path: String(i.path),
    type: i.type === 'directory' ? 'directory' : 'file',
    size: Number(i.size) || 0,
    lastModified: i.lastModified || null,
  }));
}

/** Teljes fájl memóriába (kis fájlokhoz: ikon, képernyőkép). */
export async function nasReadBuffer(path: string): Promise<Buffer> {
  const res = await nasFetch('read', `/download?path=${encodeURIComponent(toStorageApiPath(path))}`);
  if (!res.ok) throw new Error(await describeError(res, 'A fájl nem tölthető le'));
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Fájl letöltése folyamként (Range fejléc átadható). A hívó a `Response` törzsét közvetlenül
 * továbbíthatja, így nagy APK-k sem kerülnek memóriába.
 */
export async function nasDownload(path: string, range?: string | null): Promise<Response> {
  const res = await nasFetch('read', `/download?path=${encodeURIComponent(toStorageApiPath(path))}`, {
    headers: range ? { Range: range } : {},
  });
  // 206 (részleges) és 416 (nem teljesíthető tartomány) is továbbadandó a kliensnek
  if (!res.ok && res.status !== 206 && res.status !== 416) {
    throw new Error(await describeError(res, 'A fájl nem tölthető le'));
  }
  return res;
}

/* ------------------------------------------------------------------ */
/* Törlés                                                              */
/* ------------------------------------------------------------------ */

/** Fájl (vagy `recursive` esetén mappa) törlése. A már nem létező elem nem hiba. */
export async function nasDelete(path: string, recursive = false): Promise<void> {
  // A szolgáltatás dokumentációja szerint a törlés lekérdezési paraméterekkel megy (mappánál recursive=true);
  // a törzset is elküldjük, hogy a régebbi szolgáltatás-verzió is értse.
  const target = toStorageApiPath(path);
  const query = `path=${encodeURIComponent(target)}${recursive ? '&recursive=true' : ''}`;
  const res = await nasFetch('write', `/files?${query}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: target, recursive }),
  });
  if (res.status === 404) return;
  if (!res.ok) throw new Error(await describeError(res, `A törlés nem sikerült: ${path}`));
}

/* ------------------------------------------------------------------ */
/* Feltöltés (/upload/start → /upload/chunk → /upload/finish)           */
/* ------------------------------------------------------------------ */

/** Egy feltöltendő szelet: memóriapuffer vagy helyi fájl. */
type Part = { buffer: Buffer } | { filePath: string };

const MAX_PART_BYTES = 8 * 1024 * 1024; // a szeleteket ennél nem nagyobbra vágjuk

async function partBuffers(parts: Part[]): Promise<AsyncGenerator<Buffer>> {
  async function* gen() {
    for (const part of parts) {
      if ('buffer' in part) {
        for (let o = 0; o < part.buffer.length; o += MAX_PART_BYTES) {
          yield part.buffer.subarray(o, o + MAX_PART_BYTES);
        }
      } else {
        // Helyi fájl: MAX_PART_BYTES méretű darabokban olvassuk, nem egyben
        const stream = fs.createReadStream(part.filePath, { highWaterMark: MAX_PART_BYTES });
        let carry: Buffer[] = [];
        let carried = 0;
        for await (const piece of stream) {
          carry.push(piece as Buffer);
          carried += (piece as Buffer).length;
          if (carried >= MAX_PART_BYTES) {
            yield Buffer.concat(carry);
            carry = [];
            carried = 0;
          }
        }
        if (carried > 0) yield Buffer.concat(carry);
      }
    }
  }
  return gen();
}

/**
 * Fájl feltöltése a tárolóra a szolgáltatás szelet-alapú API-ján. A `dir` és `filename` a végleges
 * hely; hibánál megszakítja a munkamenetet (`/upload/failed`), hogy ne maradjon szemét a tárolón.
 */
async function nasUpload(dir: string, filename: string, parts: Part[], totalSize: number): Promise<void> {
  const targetPath = toStorageApiPath(dir);

  const startRes = await nasFetch('write', '/upload/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, fileSize: totalSize, targetPath }),
  });
  if (!startRes.ok) throw new Error(await describeError(startRes, 'A feltöltés indítása nem sikerült'));
  const { uploadId } = await startRes.json();
  if (!uploadId) throw new Error('A feltöltő szolgáltatás nem adott feltöltési azonosítót.');

  try {
    let index = 0;
    for await (const piece of await partBuffers(parts)) {
      const form = new FormData();
      form.append('uploadId', uploadId);
      form.append('chunkIndex', String(index));
      form.append('filename', filename);
      form.append('file', new Blob([new Uint8Array(piece)]), `${filename}.part${index}`);
      const res = await nasFetch('write', '/upload/chunk', { method: 'POST', body: form });
      if (!res.ok) throw new Error(await describeError(res, `A(z) ${index}. szelet feltöltése nem sikerült`));
      index++;
    }
    if (index === 0) throw new Error('Üres fájl nem tölthető fel.');

    const finish = await nasFetch('write', '/upload/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId, totalChunks: index, filename, targetPath }),
    });
    if (!finish.ok) throw new Error(await describeError(finish, 'A feltöltés véglegesítése nem sikerült'));
  } catch (err) {
    // Takarítás: a megszakítás hibája nem írja felül az eredeti hibát
    try {
      await nasFetch('write', '/upload/failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, filename }),
      });
    } catch (cleanupErr) {
      console.warn('[NAS] A megszakított feltöltés takarítása nem sikerült:', cleanupErr);
    }
    throw err;
  }
}

/** Memóriapuffer feltöltése (ikon, képernyőkép). A teljes útvonal tartalmazza a fájlnevet. */
export async function nasUploadBuffer(remotePath: string, buffer: Buffer): Promise<void> {
  const idx = remotePath.lastIndexOf('/');
  await nasUpload(remotePath.substring(0, idx), remotePath.substring(idx + 1), [{ buffer }], buffer.length);
}

/* ------------------------------------------------------------------ */
/* APK verziókezelés és megőrzés                                        */
/* ------------------------------------------------------------------ */

/**
 * Egy tárolt APK-útvonalból (pl. /EpochMedia/novastore/apps/pkg/apk/app-v3.apk) a mappa útvonala.
 */
export function apkDirFromPath(apkWebDavPath?: string): string | undefined {
  if (!apkWebDavPath || !apkWebDavPath.includes('/')) return undefined;
  return apkWebDavPath.substring(0, apkWebDavPath.lastIndexOf('/'));
}

/**
 * Az APK-megőrzés érvényesítése: egy app mappájában legfeljebb `maxFiles` (alap: 3) legújabb
 * APK marad, a többit töröljük. Csak `.apk` fájlt érint, a verziókód (`app-v<N>.apk`) szerint rendez.
 */
export async function enforceMaxApkRetention(
  packageName: string,
  maxFiles: number = 3,
  apkDirOverride?: string
): Promise<{ deleted: string[]; remaining: string[] }> {
  const apkDir = apkDirOverride || `${getAppStoragePath(packageName)}/apk`;

  let items: NasItem[];
  try {
    items = await nasList(apkDir);
  } catch (err) {
    console.warn(`[NAS Retention] Nem listázható: ${apkDir}`, err);
    return { deleted: [], remaining: [] };
  }

  const apkFiles = items.filter((i) => i.type === 'file' && i.name.toLowerCase().endsWith('.apk'));
  if (apkFiles.length <= maxFiles) {
    return { deleted: [], remaining: apkFiles.map((f) => f.path) };
  }

  const versionOf = (name: string): number => {
    const m = name.match(/v(\d+)\.apk$/i);
    return m ? parseInt(m[1], 10) : -1;
  };
  apkFiles.sort((a, b) => {
    const diff = versionOf(b.name) - versionOf(a.name);
    if (diff !== 0) return diff;
    return (b.lastModified ? Date.parse(b.lastModified) : 0) - (a.lastModified ? Date.parse(a.lastModified) : 0);
  });

  const toKeep = apkFiles.slice(0, maxFiles);
  const toDelete = apkFiles.slice(maxFiles);
  const deleted: string[] = [];

  for (const file of toDelete) {
    try {
      console.log(`[NAS Retention] Régi APK törlése (${packageName}): ${file.path}`);
      await nasDelete(file.path);
      deleted.push(file.path);
    } catch (err) {
      console.error(`[NAS Retention] A törlés nem sikerült: ${file.path}`, err);
    }
  }

  return { deleted, remaining: toKeep.map((f) => f.path) };
}

/**
 * A helyi szelet-fájlokból (CI/szerveroldali feltöltés) összeállított APK feltöltése a tárolóra,
 * majd a megőrzési szabály érvényesítése. Az APK helye: <app mappa>/apk/app-v<verziókód>.apk.
 */
export async function manageApkVersioningFromChunks(
  packageName: string,
  newVersionCode: number,
  chunkFilePaths: string[]
): Promise<{ finalPath: string; sizeBytes: number }> {
  const apkDir = `${getAppStoragePath(packageName)}/apk`;
  const filename = `app-v${newVersionCode}.apk`;
  const sizeBytes = chunkFilePaths.reduce((sum, p) => sum + fs.statSync(p).size, 0);

  await nasUpload(apkDir, filename, chunkFilePaths.map((filePath) => ({ filePath })), sizeBytes);

  try {
    await enforceMaxApkRetention(packageName, 3);
  } catch (retentionErr) {
    console.warn(`[NAS Retention] Hiba a megőrzés érvényesítésekor (${packageName}):`, retentionErr);
  }

  return { finalPath: `${apkDir}/${filename}`, sizeBytes };
}
