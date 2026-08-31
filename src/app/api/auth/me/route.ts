import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userAuth';
import { connectToDatabase } from '@/lib/db';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tokenUser = await getUserFromRequest(req);
    if (!tokenUser) {
      return NextResponse.json({ error: 'Nincs bejelentkezve' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(tokenUser.userId).select('-passwordHash');
    if (!user) {
      return NextResponse.json({ error: 'Felhasználó nem található' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
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
    return NextResponse.json(
      { error: error.message || 'Hiba történt a profil lekérésekor' },
      { status: 500 }
    );
  }
}
