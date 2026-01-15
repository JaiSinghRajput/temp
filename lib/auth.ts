import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { AuthPayload } from '@/lib/types';

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthPayload;
}

/* ---------------------------------------------------
   🔐 Decode token safely (NO log spam)
---------------------------------------------------- */
export function getUserFromToken(token: string): AuthPayload | null {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch (error: any) {
    // Expected cases → treat as logged out
    if (
      error?.name === 'TokenExpiredError' ||
      error?.name === 'JsonWebTokenError'
    ) {
      return null;
    }

    // Only log unexpected errors
    console.error('Unexpected JWT error:', error);
    return null;
  }
}

/* ---------------------------------------------------
   🔐 Generic auth wrapper
---------------------------------------------------- */
export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const token = req.cookies.get('__auth_token__')?.value;

      if (!token) {
        return unauthorizedResponse();
      }

      const user = getUserFromToken(token);

      if (!user) {
        return unauthorizedResponse(true);
      }

      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = user;

      return handler(authenticatedReq);
    } catch (error) {
      console.error('Auth middleware unexpected error:', error);
      return unauthorizedResponse(true);
    }
  };
}

/* ---------------------------------------------------
   🔐 Admin auth
---------------------------------------------------- */
export function withAdminAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (req) => {
    if (!req.user) {
      return unauthorizedResponse();
    }

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return handler(req);
  });
}

/* ---------------------------------------------------
   🔐 Super admin auth
---------------------------------------------------- */
export function withSuperAdminAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (req) => {
    if (!req.user) {
      return unauthorizedResponse();
    }

    if (req.user.role !== 'super_admin') {
      return NextResponse.json(
        {
          success: false,
          message: 'Insufficient permissions: Super Admin access required',
        },
        { status: 403 }
      );
    }

    return handler(req);
  });
}

/* ---------------------------------------------------
   🚫 Shared unauthorized response
---------------------------------------------------- */
function unauthorizedResponse(clearCookie = false) {
  const res = NextResponse.json(
    { success: false, message: 'Unauthorized' },
    { status: 401 }
  );

  // 🔥 Clear invalid / expired token
  if (clearCookie) {
    res.cookies.delete('__auth_token__');
  }

  return res;
}
