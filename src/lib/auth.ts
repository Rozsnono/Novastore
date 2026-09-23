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
 * Supports cookies, x-admin-key header, or Authorization: Bearer <token> header
 */
export async function getAdminSession(req?: NextRequest): Promise<AdminSession | null> {
  if (req) {
    // 1. Direct master key header check (useful for CI/CD and automated pipelines)
    const adminKeyHeader = req.headers.get('x-admin-key');
    if (adminKeyHeader && verifyMasterKey(adminKeyHeader)) {
      return {
        authenticated: true,
        role: 'admin',
        timestamp: Date.now(),
      };
    }

    // 2. Bearer token check
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7).trim();
      if (bearerToken) {
        if (verifyMasterKey(bearerToken)) {
          return {
            authenticated: true,
            role: 'admin',
            timestamp: Date.now(),
          };
        }
        const session = await verifyAdminSessionToken(bearerToken);
        if (session) return session;
      }
    }

    // 3. Cookie check
    const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
    if (cookieToken) {
      return verifyAdminSessionToken(cookieToken);
    }

    return null;
  }

  // Server components / cookie fallback
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return verifyAdminSessionToken(token);
}

export { COOKIE_NAME };
