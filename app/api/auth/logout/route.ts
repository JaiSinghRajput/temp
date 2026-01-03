import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_OPTIONS } from '@/lib/constants';

// Clear the auth cookie explicitly on logout
export async function POST(req: NextRequest) {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  );

  response.cookies.set(COOKIE_OPTIONS.AUTH_TOKEN.name, '', {
    httpOnly: COOKIE_OPTIONS.AUTH_TOKEN.httpOnly,
    secure: COOKIE_OPTIONS.AUTH_TOKEN.secure,
    sameSite: COOKIE_OPTIONS.AUTH_TOKEN.sameSite,
    maxAge: 0,
    path: COOKIE_OPTIONS.AUTH_TOKEN.path,
  });

  return response;
}
