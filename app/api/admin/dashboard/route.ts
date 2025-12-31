import { NextResponse } from 'next/server';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/auth';

/**
 * GET /api/admin/dashboard
 * 
 * Protected admin endpoint - only accessible to admins
 * Returns admin dashboard data
 */
export const GET = withAdminAuth(async (req: AuthenticatedRequest) => {
  try {
    const user = req.user;

    return NextResponse.json(
      {
        success: true,
        message: 'Admin dashboard access granted',
        user: {
          id: user?.id,
          name: user?.name,
          role: user?.role,
        },
        data: {
          // Add your dashboard data here
          totalUsers: 0,
          totalTemplates: 0,
          totalCards: 0,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
});
