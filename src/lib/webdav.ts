import { createClient, WebDAVClient, FileStat } from 'webdav';
import { Readable } from 'stream';

const WEBDAV_URL = process.env.WEBDAV_URL || 'http://localhost:8080/webdav';
const WEBDAV_USERNAME = process.env.WEBDAV_USERNAME || 'admin';
const WEBDAV_PASSWORD = process.env.WEBDAV_PASSWORD || 'password';
const ROOT_PATH = (process.env.WEBDAV_ROOT_PATH || '/novastore/apps').replace(/\/$/, '');

let clientInstance: WebDAVClient | null = null;

export function getWebDAVClient(): WebDAVClient {
  if (!clientInstance) {
    clientInstance = createClient(WEBDAV_URL, {
      username: WEBDAV_USERNAME,
      password: WEBDAV_PASSWORD,
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
 * Manage APK Versioning on WebDAV:
 * - Current version is placed at: /novastore/apps/{pkg}/apk/app-v{versionCode}.apk
 * - Immediate previous version is preserved as: /novastore/apps/{pkg}/apk/backup-v{oldVersionCode}.apk
 * - Any older backups are permanently deleted to conserve NAS space.
 */
export async function manageApkVersioning(
  packageName: string,
  newVersionCode: number,
  newApkBuffer: Buffer
): Promise<{ finalPath: string; sizeBytes: number }> {
  const client = getWebDAVClient();
  const appDir = getAppStoragePath(packageName);
  const apkDir = `${appDir}/apk`;

  await ensureDirectoryExists(apkDir);

  // List existing files in apk directory
  let existingItems: FileStat[] = [];
  try {
    const items = await client.getDirectoryContents(apkDir);
    existingItems = Array.isArray(items)
      ? (items as FileStat[])
      : ((items as any)?.data as FileStat[]) || [];
  } catch {
    existingItems = [];
  }

  // Identify current active apk (e.g. app-v1.apk) and existing backups
  const currentActiveApk = existingItems.find(
    (item) => item.basename.startsWith('app-v') && item.basename.endsWith('.apk')
  );
  const oldBackups = existingItems.filter(
    (item) => item.basename.startsWith('backup-v') && item.basename.endsWith('.apk')
  );

  // 1. Delete all older backups to keep only 1 immediate prior version
  for (const oldBackup of oldBackups) {
    try {
      await client.deleteFile(oldBackup.filename);
    } catch (err) {
      console.warn(`Failed to delete old backup ${oldBackup.filename}:`, err);
    }
  }

  // 2. If there is a current active APK with a different version, rename it to backup
  if (currentActiveApk) {
    const match = currentActiveApk.basename.match(/^app-v(\d+)\.apk$/);
    const oldVersion = match ? match[1] : 'prev';
    const backupPath = `${apkDir}/backup-v${oldVersion}.apk`;
    
    try {
      // Copy / move current to backup
      await client.moveFile(currentActiveApk.filename, backupPath);
    } catch {
      // Fallback if move fails: delete current active
      try {
        await client.deleteFile(currentActiveApk.filename);
      } catch {}
    }
  }

  // 3. Write the new version
  const newApkPath = `${apkDir}/app-v${newVersionCode}.apk`;
  await uploadBufferToWebDAV(newApkPath, newApkBuffer);

  return {
    finalPath: newApkPath,
    sizeBytes: newApkBuffer.length,
  };
}
