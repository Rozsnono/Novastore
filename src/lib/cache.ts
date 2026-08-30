interface CacheEntry {
  buffer: Buffer;
  contentType: string;
  timestamp: number;
}

class MediaCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxEntries: number = 100;
  private ttlMs: number = 1000 * 60 * 60 * 24; // 24 hours

  get(key: string): { buffer: Buffer; contentType: string } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return { buffer: entry.buffer, contentType: entry.contentType };
  }

  set(key: string, buffer: Buffer, contentType: string): void {
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, {
      buffer,
      contentType,
      timestamp: Date.now(),
    });
  }

  invalidate(keyPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
      }
    }
  }
}

// Global singleton
declare global {
  // eslint-disable-next-line no-var
  var mediaCacheInstance: MediaCache | undefined;
}

const mediaCache = global.mediaCacheInstance || new MediaCache();
if (!global.mediaCacheInstance) {
  global.mediaCacheInstance = mediaCache;
}

export default mediaCache;
