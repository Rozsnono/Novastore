import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import User from '@/lib/models/User';
import { signUserToken } from '@/lib/userAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!checkRateLimit(`register:${getClientIp(req)}`, 10, 3600000)) {
    return NextResponse.json(
      { error: 'Túl sok regisztrációs kísérlet. Próbáld újra később.' },
      { status: 429 }
    );
  }

  try {
    const { name, email, password, dateOfBirth } = await req.json();

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof dateOfBirth !== 'string' ||
      !name.trim() || !email || !password || !dateOfBirth
    ) {
      return NextResponse.json(
        { error: 'Minden mező kitöltése kötelező (Név, Email, Jelszó, Születési dátum)' },
        { status: 400 }
      );
    }

    // A bcrypt csak az első 72 bájtot dolgozza fel; ennél hosszabb jelszót elutasítunk
    if (Buffer.byteLength(password, 'utf8') > 72) {
      return NextResponse.json(
        { error: 'A jelszó legfeljebb 72 bájt hosszú lehet' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A jelszónak legalább 6 karakter hosszúnak kell lennie' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Kérlek adj meg egy érvényes email címet' },
        { status: 400 }
      );
    }

    const parsedDob = new Date(dateOfBirth);
    if (isNaN(parsedDob.getTime())) {
      return NextResponse.json(
        { error: 'Érvénytelen születési dátum formátum' },
        { status: 400 }
      );
    }

    // Észszerű születési dátum: nem jövőbeli és nem 120 évnél régebbi
    const nowMs = Date.now();
    if (parsedDob.getTime() > nowMs || parsedDob.getFullYear() < new Date().getFullYear() - 120) {
      return NextResponse.json(
        { error: 'Érvénytelen születési dátum' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Ezzel az email címmel már regisztráltak felhasználót' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      dateOfBirth: parsedDob,
      role: 'user',
      customPermissions: [],
    });

    const token = await signUserToken(newUser);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        dateOfBirth: newUser.dateOfBirth.toISOString(),
        customPermissions: newUser.customPermissions,
        avatarUrl: newUser.avatarUrl,
      },
    });
  } catch (error: any) {
    // Versenyhelyzet: az egyedi email index megakadályozta a duplikációt
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: 'Ezzel az email címmel már regisztráltak felhasználót' },
        { status: 409 }
      );
    }
    console.error('Error during registration:', error);
    return NextResponse.json(
      { error: 'Hiba történt a regisztráció során' },
      { status: 500 }
    );
  }
}
