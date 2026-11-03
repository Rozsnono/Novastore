import { createClient, WebDAVClient, FileStat } from 'webdav';
import { Readable } from 'stream';
import fs from 'fs';

import { requireEnv } from './env';
import { toWebDavRelativePath } from './storageApi';

const ROOT_PATH = (process.env.WEBDAV_ROOT_PATH || '/novastore/apps').replace(/\/$/, '');

let clientInstance: WebDAVClient | null = null;

export function getWebDAVClient(): WebDAVClient {
  if (!clientInstance) {
    // Lazy olvasás, kódba égetett tartalék hitelesítő adatok nélkül.
    clientInstance = createClient(requireEnv('WEBDAV_URL'), {
      username: requireEnv('WEBDAV_USERNAME'),
      password: requireEnv('WEBDAV_PASSWORD'),
    });
  }
  return clientInstance;
}

/**
 * Ensure all parent directories exist on the WebDAV NAS
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  const client = getWebDAVClient();
  const segments = dirPath.split('/').filter(Boolean);
  let currentPath = '';

  for (const segment of segments) {
    currentPath += `/${segment}`;
    try {
      const exists = await client.exists(currentPath);
      if (!exists) {
        await client.createDirectory(currentPath);
      }
    } catch (err) {
      // Some WebDAV servers throw if dir already exists
    }
  }
}

/**
 * Get the full NAS directory path for an app
 */
export function getAppStoragePath(packageName: string): string {
  const sanitizedPackage = packageName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${ROOT_PATH}/${sanitizedPackage}`;
}

/**
 * Upload a binary buffer to a specified WebDAV path
 */
export async function uploadBufferToWebDAV(
  remotePath: string,
  buffer: Buffer
): Promise<void> {
  const client = getWebDAVClient();
  const dir = remotePath.substring(0, remotePath.lastIndexOf('/'));
  await ensureDirectoryExists(dir);
  await client.putFileContents(remotePath, buffer, { overwrite: true });
}

/**
 * Upload a readable stream to WebDAV
 */
export async function uploadStreamToWebDAV(
  remotePath: string,
  stream: Readable | ReadableStream
): Promise<void> {
  const client = getWebDAVClient();
  const dir = remotePath.substring(0, remotePath.lastIndexOf('/'));
  await ensureDirectoryExists(dir);
  await client.putFileContents(remotePath, stream as any, { overwrite: true });
}

/**
 * Download a file as a Buffer from WebDAV
 */
export async function getFileBufferFromWebDAV(remotePath: string): Promise<Buffer> {
  const client = getWebDAVClient();
  const data = await client.getFileContents(remotePath, { format: 'binary' });
  return Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
}

/**
 * Read a byte range slice from a file on WebDAV (or full stream)
 */
export async function getFileStreamFromWebDAV(
  remotePath: string,
  range?: { start: number; end: number }
): Promise<NodeJS.ReadableStream> {
  const client = getWebDAVClient();
  const headers: Record<string, string> = {};
  if (range) {
    headers['Range'] = `bytes=${range.start}-${range.end}`;
  }
  return client.createReadStream(remotePath, { headers });
}

/**
 * Get file stat/metadata from WebDAV
 */
export async function getFileStatFromWebDAV(remotePath: string): Promise<FileStat> {
  const client = getWebDAVClient();
  const stat = await client.stat(remotePath);
  return stat as FileStat;
}

/**
 * Delete a file or directory from WebDAV
 */
export async function deleteWebDAVPath(remotePath: string): Promise<void> {
  const client = getWebDAVClient();
  try {
    const exists = await client.exists(remotePath);
    if (exists) {
      await client.deleteFile(remotePath);
    }
  } catch (err) {
    console.error(`Failed to delete WebDAV path: ${remotePath}`, err);
  }
}

/**
 * Enforce maximum APK retention limit on WebDAV NAS.
 * Keeps at most `maxFiles` (default: 3) newest APK files in the app's apk directory.
 * The oldest files (by lastmod date) are permanently deleted.
 */
export async function enforceMaxApkRetention(
  packageName: string,
  maxFiles: number = 3,
  apkDirOverride?: string
): Promise<{ deleted: string[]; remaining: string[] }> {
  const client = getWebDAVClient();
  // Ha ismert a tárolt APK útvonala (a NAS szolgáltatás gyökerével együtt), annak mappáját használjuk;
  // különben az alapértelmezett WEBDAV_ROOT_PATH alatti mappát.
  const apkDir = apkDirOverride || `${getAppStoragePath(packageName)}/apk`;

  let existingItems: FileStat[] = [];
  try {
    const items = await client.getDirectoryContents(apkDir);
    existingItems = Array.isArray(items)
      ? (items as FileStat[])
      : ((items as any)?.data as FileStat[]) || [];
  } catch (err) {
    console.warn(`[NAS Retention] Could not list ${apkDir}:`, err);
    return { deleted: [], remaining: [] };
  }

  // Csak a ténylegesen .apk kiterjesztésű fájlokat kezeljük (más fájlt soha nem törlünk)
  const apkFiles = existingItems.filter(
    (item) => item.type === 'file' && item.basename.toLowerCase().endsWith('.apk')
  );

  if (apkFiles.length <= maxFiles) {
    return {
      deleted: [],
      remaining: apkFiles.map((f) => f.filename),
    };
  }

  // Rendezés: elsődlegesen a fájlnévből kinyert verziókód (legújabb elöl), így egy régebbi
  // verzió újrafeltöltése nem törölheti a legfrissebbet; egyezésnél a módosítási idő dönt.
  const versionOf = (name: string): number => {
    const m = name.match(/v(\d+)\.apk$/i);
    return m ? parseInt(m[1], 10) : -1;
  };
  apkFiles.sort((a, b) => {
    const vA = versionOf(a.basename);
    const vB = versionOf(b.basename);
    if (vB !== vA) return vB - vA;
    const timeA = a.lastmod ? new Date(a.lastmod).getTime() : 0;
    const timeB = b.lastmod ? new Date(b.lastmod).getTime() : 0;
    return timeB - timeA;
  });

  const toKeep = apkFiles.slice(0, maxFiles);
  const toDelete = apkFiles.slice(maxFiles);
  const deleted: string[] = [];

  for (const file of toDelete) {
    try {
      console.log(`[NAS Retention] Deleting excess old APK for ${packageName}: ${file.filename} (lastmod: ${file.lastmod})`);
      await client.deleteFile(file.filename);
      deleted.push(file.filename);
    } catch (err) {
      console.error(`[NAS Retention] Failed to delete excess old APK ${file.filename}:`, err);
    }
  }

  return {
    deleted,
    remaining: toKeep.map((f) => f.filename),
  };
}

/**
 * Egy tárolt APK-útvonalból (pl. /EpochMedia/novastore/apps/pkg/apk/app-v3.apk) a mappa útvonala.
 */
export function apkDirFromPath(apkWebDavPath?: string): string | undefined {
  if (!apkWebDavPath || !apkWebDavPath.includes('/')) return undefined;
  const dir = apkWebDavPath.substring(0, apkWebDavPath.lastIndexOf('/'));
  // A NAS szolgáltatás gyökeres útvonalát WebDAV-relatívvá alakítjuk (ezt használja a WebDAV-kliens)
  return toWebDavRelativePath(dir);
}

/**
 * Manage APK Versioning on WebDAV:
 * - Current version is placed at: /novastore/apps/{pkg}/apk/app-v{versionCode}.apk
 * - Immediate previous version is preserved as: /novastore/apps/{pkg}/apk/backup-v{oldVersionCode}.apk
 * - Any excess files beyond the 3 newest are permanently deleted.
 */
export async function manageApkVersioning(
  packageName: string,
  newVersionCode: number,
  newApkBuffer: Buffer
): Promise<{ finalPath: string; sizeBytes: number }> {
  const appDir = getAppStoragePath(packageName);
  const apkDir = `${appDir}/apk`;

  await ensureDirectoryExists(apkDir);

  // 1. Write the new version
  const newApkPath = `${apkDir}/app-v${newVersionCode}.apk`;
  await uploadBufferToWebDAV(newApkPath, newApkBuffer);

  // 2. Enforce max 3 APK files retention on NAS
  try {
    await enforceMaxApkRetention(packageName, 3);
  } catch (retentionErr) {
    console.warn(`[NAS Retention] Error enforcing retention for ${packageName}:`, retentionErr);
  }

  return {
    finalPath: newApkPath,
    sizeBytes: newApkBuffer.length,
  };
}


/**
 * Streaming változat: a szelet-fájlokat egymás után, memóriába összefűzés nélkül tölti fel
 * a NAS-ra (a teljes APK helyett egyszerre csak egy darab van a memóriában).
 * Az `manageApkVersioning` puffer-alapú változata a kompatibilitás miatt megmarad.
 */
export async function manageApkVersioningFromChunks(
  packageName: string,
  newVersionCode: number,
  chunkFilePaths: string[]
): Promise<{ finalPath: string; sizeBytes: number }> {
  const apkDir = `${getAppStoragePath(packageName)}/apk`;
  await ensureDirectoryExists(apkDir);

  const sizeBytes = chunkFilePaths.reduce((sum, p) => sum + fs.statSync(p).size, 0);
  const newApkPath = `${apkDir}/app-v${newVersionCode}.apk`;

  async function* readChunks() {
    for (const chunkPath of chunkFilePaths) {
      for await (const part of fs.createReadStream(chunkPath)) {
        yield part;
      }
    }
  }

  await getWebDAVClient().putFileContents(newApkPath, Readable.from(readChunks()) as any, {
    overwrite: true,
    contentLength: sizeBytes,
  });

  try {
    await enforceMaxApkRetention(packageName, 3);
  } catch (retentionErr) {
    console.warn(`[NAS Retention] Error enforcing retention for ${packageName}:`, retentionErr);
  }

  return { finalPath: newApkPath, sizeBytes };
}
