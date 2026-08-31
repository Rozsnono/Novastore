import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import User from '@/lib/models/User';
import { signUserToken } from '@/lib/userAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email cím és jelszó megadása kötelező' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json(
        { error: 'Hibás email cím vagy jelszó' },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Hibás email cím vagy jelszó' },
        { status: 401 }
      );
    }

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
      { error: error.message || 'Hiba történt a bejelentkezés során' },
      { status: 500 }
    );
  }
}
