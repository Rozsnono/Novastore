import { NextRequest } from 'next/server';

/**
 * Egyszerű, memóriabeli (processzenkénti) sebességkorlátozó.
 * Elegendő egy példányos futtatáshoz; több példány esetén megosztott tároló (pl. Redis) kell.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function getClientIp(req: NextRequest): string {
  // A fordított proxy által hozzáfűzött UTOLSÓ bejegyzést használjuk: az első elem
  // a kliens által hamisítható, így azzal a sebességkorlát megkerülhető lenne.
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Törli a számlálót (pl. sikeres bejelentkezés után, hogy csak a hibás próbálkozások számítsanak).
 */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * @returns true, ha a kérés engedélyezett; false, ha a limit túllépve.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Alkalmi takarítás, hogy a map ne nőjön végtelenül
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}
