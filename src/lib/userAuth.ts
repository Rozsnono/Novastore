import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { IUser, IAppItem, AppAccessLevel } from '@/types';
import User from './models/User';
import { connectToDatabase } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'novastore-super-secret-default-jwt-key-2026';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface UserTokenPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  dateOfBirth: string;
  customPermissions: string[];
}

/**
 * Signs a JWT token for an authenticated user
 */
export async function signUserToken(user: {
  _id: string | any;
  email: string;
  name: string;
  role: string;
  dateOfBirth: Date | string;
  customPermissions?: string[];
}): Promise<string> {
  const payload: UserTokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    dateOfBirth: new Date(user.dateOfBirth).toISOString(),
    customPermissions: user.customPermissions || [],
  };

  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('90d') // 90 days validity
    .sign(secretKey);
}

/**
 * Verifies a user JWT token
 */
export async function verifyUserToken(token: string): Promise<UserTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as UserTokenPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Extracts and verifies the authenticated user from a NextRequest
 */
export async function getUserFromRequest(req: NextRequest): Promise<UserTokenPayload | null> {
  // 1. Check Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const payload = await verifyUserToken(token);
    if (payload) return payload;
  }

  // 2. Check query parameter ?token=...
  const tokenParam = req.nextUrl.searchParams.get('token');
  if (tokenParam) {
    const payload = await verifyUserToken(tokenParam);
    if (payload) return payload;
  }

  // 3. Check cookie
  const cookie = req.cookies.get('novastore_user_token');
  if (cookie?.value) {
    const payload = await verifyUserToken(cookie.value);
    if (payload) return payload;
  }

  return null;
}

/**
 * Calculates exact age from date of birth
 */
export function calculateAge(dobInput: Date | string): number {
  const dob = new Date(dobInput);
  const diffMs = Date.now() - dob.getTime();
  const ageDt = new Date(diffMs);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}

/**
 * Evaluates whether a user has permission to download/access a specific app
 */
export function canUserAccessApp(
  user: UserTokenPayload | null,
  app: {
    accessLevel?: AppAccessLevel | string;
    requiredRoles?: string[];
    requiredPermissions?: string[];
  }
): { allowed: boolean; reason?: string } {
  const level = app.accessLevel || 'public';

  // 1. Public apps can be downloaded by everyone
  if (level === 'public') {
    return { allowed: true };
  }

  // 2. Requires at least a logged in account
  if (!user) {
    return {
      allowed: false,
      reason: 'Az alkalmazás eléréséhez bejelentkezés szükséges.',
    };
  }

  // 3. Age-restricted (18+)
  if (level === 'age_18') {
    const age = calculateAge(user.dateOfBirth);
    if (age < 18) {
      return {
        allowed: false,
        reason: 'Ez az alkalmazás kizárólag 18 éven felüli felhasználók számára érhető el.',
      };
    }
    return { allowed: true };
  }

  // 4. Restricted access (VIP, tester, specific roles or custom permissions)
  if (level === 'restricted') {
    if (user.role === 'admin') {
      return { allowed: true };
    }

    const hasRole =
      app.requiredRoles &&
      app.requiredRoles.length > 0 &&
      app.requiredRoles.includes(user.role);

    const hasPermission =
      app.requiredPermissions &&
      app.requiredPermissions.length > 0 &&
      app.requiredPermissions.some((perm) =>
        (user.customPermissions || []).includes(perm)
      );

    if (hasRole || hasPermission) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Nincs megfelelő jogosultságod ennek az alkalmazásnak a letöltéséhez.',
    };
  }

  return { allowed: true };
}
