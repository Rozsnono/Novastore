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
 * Extracts and verifies the authenticated user from a NextRequest.
 * When fetchFromDb is true, fetches the current user from MongoDB so that any role
 * or permission changes applied in the admin panel take effect immediately.
 */
export async function getUserFromRequest(
  req: NextRequest,
  fetchFromDb = false
): Promise<UserTokenPayload | null> {
  let token: string | undefined;

  // 1. Check Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.nextUrl.searchParams.get('token')) {
    token = req.nextUrl.searchParams.get('token')!;
  } else if (req.cookies.get('novastore_user_token')?.value) {
    token = req.cookies.get('novastore_user_token')?.value;
  }

  if (!token) return null;

  const payload = await verifyUserToken(token);
  if (!payload) return null;

  if (fetchFromDb && payload.userId) {
    try {
      await connectToDatabase();
      const freshUser = await User.findById(payload.userId);
      if (freshUser) {
        return {
          userId: freshUser._id.toString(),
          email: freshUser.email,
          name: freshUser.name,
          role: freshUser.role,
          dateOfBirth: new Date(freshUser.dateOfBirth).toISOString(),
          customPermissions: freshUser.customPermissions || [],
        };
      }
    } catch (e) {
      console.warn('Error fetching fresh user from DB in getUserFromRequest:', e);
    }
  }

  return payload;
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
  const level = (app.accessLevel || 'public').toLowerCase();

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

  // Admin users always have unrestricted access
  if (user.role && user.role.toLowerCase() === 'admin') {
    return { allowed: true };
  }

  // 3. Registered access level: any logged in user
  if (level === 'registered') {
    return { allowed: true };
  }

  // 4. Age-restricted (18+)
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

  // 5. Restricted access (VIP, tester, developer, specific roles or custom permissions)
  if (level === 'restricted') {
    const userRole = (user.role || '').toLowerCase().trim();

    const hasRole =
      Array.isArray(app.requiredRoles) &&
      app.requiredRoles.length > 0 &&
      app.requiredRoles.some((r) => r.toLowerCase().trim() === userRole);

    const userPerms = (user.customPermissions || []).map((p) => p.toLowerCase().trim());
    const hasPermission =
      Array.isArray(app.requiredPermissions) &&
      app.requiredPermissions.length > 0 &&
      app.requiredPermissions.some((perm) => userPerms.includes(perm.toLowerCase().trim()));

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
