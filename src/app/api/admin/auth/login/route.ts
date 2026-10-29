import { NextRequest, NextResponse } from 'next/server';
import { verifyMasterKey, createAdminSessionToken, COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit, getClientIp, resetRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const rateKey = `admin-login:${getClientIp(req)}`;
  if (!checkRateLimit(rateKey, 5, 900000)) {
    return NextResponse.json(
      { error: 'Túl sok sikertelen próbálkozás. Próbáld újra később.' },
      { status: 429 }
    );
  }

  try {
    const { password } = await req.json();

    if (typeof password !== 'string' || !password || !verifyMasterKey(password)) {
      return NextResponse.json(
        { error: 'Invalid masterkey password' },
        { status: 401 }
      );
    }

    // Sikeres belépés: csak a hibás próbálkozások számítanak a limitbe
    resetRateLimit(rateKey);

    const token = await createAdminSessionToken();

    const response = NextResponse.json({
      success: true,
      message: 'Admin session authenticated successfully',
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
