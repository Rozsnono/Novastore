/**
 * Közös bemenet-ellenőrző segédfüggvények az API végpontokhoz.
 */

/**
 * Speciális reguláris kifejezés karakterek escape-elése, hogy a felhasználói keresőszöveg
 * ne értelmeződjön mintaként (érvénytelen minta → 500, rosszindulatú minta → lassulás).
 */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Lekérdezési paraméter egész számmá alakítása [min, max] tartományra szorítva.
 * Érvénytelen (NaN, hiányzó) érték esetén az alapértéket adja vissza.
 */
export function parseBoundedInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** Igaz, ha az érték nem üres szöveg. */
export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}
