import { NextRequest, NextResponse } from 'next/server';
import { verifyMasterKey, createAdminSessionToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || !verifyMasterKey(password)) {
      return NextResponse.json(
        { error: 'Invalid masterkey password' },
        { status: 401 }
      );
    }

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
