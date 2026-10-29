import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import User from '@/lib/models/User';
import { signUserToken } from '@/lib/userAuth';
import { checkRateLimit, getClientIp, resetRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Érvényes bcrypt-hash egy ismeretlen jelszóra, az időzítés-kiegyenlítéshez.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.Gb1gQ0Z6sYb0nQ3x5Zl0ZxXcZ0eK';

export async function POST(req: NextRequest) {
  const rateKey = `user-login:${getClientIp(req)}`;
  if (!checkRateLimit(rateKey, 10, 900000)) {
    return NextResponse.json(
      { error: 'Túl sok bejelentkezési próbálkozás. Próbáld újra később.' },
      { status: 429 }
    );
  }

  try {
    const { email, password } = await req.json();

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return NextResponse.json(
        { error: 'Email cím és jelszó megadása kötelező' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Ismeretlen emailnél is lefuttatunk egy bcrypt-összehasonlítást, hogy az időzítésből
    // ne derüljön ki, mely címek regisztráltak.
    const hashToCheck = user ? user.passwordHash : DUMMY_HASH;
    const isMatch = await bcrypt.compare(password, hashToCheck);
    if (!user) {
      return NextResponse.json(
        { error: 'Hibás email cím vagy jelszó' },
        { status: 401 }
      );
    }

    if (!isMatch) {
      return NextResponse.json(
        { error: 'Hibás email cím vagy jelszó' },
        { status: 401 }
      );
    }

    // Sikeres belépés: a hibás próbálkozások számlálóját nullázzuk (NAT mögött ne zárjuk ki egymást)
    resetRateLimit(rateKey);

    const token = await signUserToken(user);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        dateOfBirth: user.dateOfBirth.toISOString(),
        customPermissions: user.customPermissions,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Hiba történt a bejelentkezés során' },
      { status: 500 }
    );
  }
}
