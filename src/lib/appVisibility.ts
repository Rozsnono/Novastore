import { canUserAccessApp, UserTokenPayload } from './userAuth';

/**
 * A katalógus (lista/részletek) minden appot megmutat, de azoknál, amelyekhez a
 * felhasználónak nincs hozzáférése, a tárhely belső útvonalát (apkWebDavPath) nem adjuk ki.
 * A mező megmarad (üres szöveggel), hogy a már kiadott appverziók válaszformátuma ne törjön.
 */
export function redactAppForUser<T extends { toObject?: () => any }>(
  app: T,
  user: UserTokenPayload | null
): any {
  const plain = typeof app.toObject === 'function' ? app.toObject() : { ...(app as any) };
  if (!canUserAccessApp(user, plain).allowed) {
    plain.apkWebDavPath = '';
  }
  return plain;
}
