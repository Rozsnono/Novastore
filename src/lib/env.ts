/**
 * Kötelező környezeti változó olvasása.
 * Hiány esetén érthető hibát dob (a részletes ok a szerverlogba kerül, az érték soha).
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Hiányzó konfiguráció: a(z) ${name} környezeti változó nincs beállítva.`);
  }
  return value;
}
