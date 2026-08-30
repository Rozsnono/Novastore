import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const ADMIN_MASTER_KEY = process.env.ADMIN_MASTER_KEY || 'NovaStoreSecret2026!';
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-novastore-jwt-signing-key-32chars!'
);
const COOKIE_NAME = 'novastore_admin_session';

export interface AdminSession {
  authenticated: boolean;
  role: 'admin';
  timestamp: number;
}

/**
 * Validates the provided masterkey password
 */
export function verifyMasterKey(password: string): boolean {
  return password === ADMIN_MASTER_KEY;
}

/**
 * Creates a signed JWT session for the authenticated admin
 */
export async function createAdminSessionToken(): Promise<string> {
  return new SignJWT({ role: 'admin', authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verifies a given session token
 */
export async function verifyAdminSessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload && payload.role === 'admin' && payload.authenticated === true) {
      return {
        authenticated: true,
        role: 'admin',
        timestamp: (payload.iat || 0) * 1000,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Validates the admin session from NextRequest or Server Components
 */
export async function getAdminSession(req?: NextRequest): Promise<AdminSession | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  }

  if (!token) {
    return null;
  }

  return verifyAdminSessionToken(token);
}

export { COOKIE_NAME };
