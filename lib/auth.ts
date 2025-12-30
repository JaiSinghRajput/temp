import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '@/lib/types';

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthPayload;
}

/**
 * Middleware to verify JWT token from cookies
 * Adds user data to request if valid token is found
 */
export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      const token = req.cookies.get('__auth_token__')?.value;

      if (!token) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized: No token found' },
          { status: 401 }
        );
      }

      if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
      }

      const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;

      // Create a modified request with user data
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = decoded;

      return handler(authenticatedReq);
    } catch (error: any) {
      console.error('Auth middleware error:', error);

      if (error.name === 'TokenExpiredError') {
        return NextResponse.json(
          { success: false, message: 'Token expired' },
          { status: 401 }
        );
      }

      if (error.name === 'JsonWebTokenError') {
        return NextResponse.json(
          { success: false, message: 'Invalid token' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
  };
}

/**
 * Middleware to verify admin role
 */
export function withAdminAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return withAuth(async (req: AuthenticatedRequest) => {
    if (!req.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions: Admin access required' },
        { status: 403 }
      );
    }

    return handler(req);
  });
}

/**
 * Middleware to verify super admin role
 */
export function withSuperAdminAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    if (!req.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (req.user.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions: Super Admin access required' },
        { status: 403 }
      );
    }

    return handler(req);
  });
}

/**
 * Helper to get user from token (for manual verification)
 */
export function getUserFromToken(token: string): AuthPayload | null {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}
