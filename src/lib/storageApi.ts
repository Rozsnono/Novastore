/**
 * ==============================================================================
 * Dedicated Storage API Helper (NASiS3 Integration)
 * ==============================================================================
 * 
 * Provides centralized helper functions to interface with the high-performance
 * Synology NAS uploader and downloader service.
 */

/**
 * Returns the base URL of the dedicated Synology Storage API.
 */
export function getStorageApiUrl(): string {
  // Nincs kódba égetett tartalék URL: hiányzó konfigurációnál érthető hibát dobunk.
  const configured = process.env.UPLOAD_API_URL || process.env.NEXT_PUBLIC_UPLOAD_API_URL;
  if (!configured || !configured.trim()) {
    throw new Error('Hiányzó konfiguráció: UPLOAD_API_URL nincs beállítva.');
  }
  let url = configured.trim().replace(/\/+$/, '');
  if (url.startsWith('http://') && url.includes('api.filesharer.rozsnorbert.hu')) {
    url = url.replace(/^http:\/\//, 'https://');
  }
  return url;
}

/**
 * Returns the secret API key for the dedicated Storage API.
 */
export function getStorageApiKey(): string {
  // Nincs kódba égetett tartalék kulcs: hiányzó konfigurációnál érthető hibát dobunk.
  const key = process.env.UPLOAD_API_KEY || process.env.NEXT_PUBLIC_UPLOAD_API_KEY;
  if (!key) {
    throw new Error('Hiányzó konfiguráció: UPLOAD_API_KEY nincs beállítva.');
  }
  return key;
}

/**
 * Az NAS szolgáltatás feltöltési gyökere (UPLOAD_STORAGE_ROOT, pl. "/EpochMedia"): a szolgáltatás
 * a "/"-lel kezdődő útvonalat ABSZOLÚTNAK veszi, és a gyökéren kívülit elutasítja (403).
 * A szerver WebDAV-kliense viszont a WebDAV-gyökérhez képesti útvonalakat tárol (pl. "/novastore/apps/..."),
 * ezért a szolgáltatásnak küldött útvonalat a gyökérrel kiegészítjük. Ha a változó nincs beállítva,
 * az útvonal változatlan marad (visszafelé kompatibilis).
 */
function getStorageRoot(): string {
  return (process.env.UPLOAD_STORAGE_ROOT || '').trim().replace(/\/+$/, '');
}

/** WebDAV-relatív (vagy már gyökeres) útvonalból a szolgáltatás számára érvényes abszolút útvonal. */
export function toStorageApiPath(p: string): string {
  const clean = p.startsWith('/') ? p : `/${p}`;
  const root = getStorageRoot();
  if (!root || clean === root || clean.startsWith(`${root}/`)) return clean;
  return `${root}${clean}`;
}

/** A szolgáltatás abszolút útvonalából (pl. "/EpochMedia/novastore/...") a WebDAV-relatív útvonal. */
export function toWebDavRelativePath(p: string): string {
  const clean = p.startsWith('/') ? p : `/${p}`;
  const root = getStorageRoot();
  if (root && clean.startsWith(`${root}/`)) return clean.substring(root.length);
  return clean;
}

export interface DirectDownloadOptions {
  inline?: boolean;
  apiKey?: string;
  /** Ha igaz, az URL nem tartalmaz kulcsot (a kulcsot a kliens fejlécben küldi, titkosítva kapta meg). */
  omitKey?: boolean;
}

/**
 * Constructs a direct streaming download URL pointing to the NASiS3 /download endpoint.
 * 
 * @param webdavPath - The remote WebDAV path of the file (e.g. "/novastore/apps/com.foo/apk/app-v1.apk")
 * @param options - Additional download options (inline preview, custom apiKey)
 * @returns Fully-qualified direct download URL
 */
export function buildDirectDownloadUrl(
  webdavPath: string,
  options: DirectDownloadOptions = {}
): string {
  const baseUrl = getStorageApiUrl();
  const key = options.omitKey ? '' : options.apiKey || getStorageApiKey();

  // Normalize path (a szolgáltatás feltöltési gyökerével kiegészítve)
  const cleanPath = toStorageApiPath(webdavPath);

  const url = new URL('/download', baseUrl);
  url.searchParams.set('path', cleanPath);

  if (key) {
    url.searchParams.set('apiKey', key);
  }

  if (options.inline) {
    url.searchParams.set('inline', 'true');
  }

  return url.toString();
}
