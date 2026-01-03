import { NextResponse } from 'next/server';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/auth';
import pool from '@/lib/db';

/**
 * GET /api/admin/dashboard
 * 
 * Protected admin endpoint - only accessible to admins
 * Returns admin dashboard data
 */
export const GET = withAdminAuth(async (req: AuthenticatedRequest) => {
  try {
    const user = req.user;
    const connection = await pool.getConnection();

    try {
      // Fetch all statistics in parallel
      const [[usersResult], [templatesResult], [userEcardsResult], [eVideoTemplatesResult], [eVideoRequestsResult], [categoriesResult], [videoCategoriesResult]] = await Promise.all([
        connection.query('SELECT COUNT(*) as count FROM users WHERE status = 1'),
        connection.query('SELECT COUNT(*) as count FROM templates WHERE is_active = 1'),
        connection.query('SELECT COUNT(*) as count FROM user_ecards'),
        connection.query('SELECT COUNT(*) as count FROM e_video_templates WHERE is_active = 1'),
        connection.query('SELECT COUNT(*) as count, status FROM e_video_requests GROUP BY status'),
        connection.query('SELECT COUNT(*) as count FROM card_categories WHERE status = 1'),
        connection.query('SELECT COUNT(*) as count FROM video_categories WHERE status = 1'),
      ]);

      // Get recent user ecards
      const [recentCards] = await connection.query(
        `SELECT ue.id, ue.user_name, ue.created_at, t.name as template_name 
         FROM user_ecards ue 
         JOIN templates t ON ue.template_id = t.id 
         ORDER BY ue.created_at DESC 
         LIMIT 5`
      );

      // Get recent e-video requests
      const [recentRequests] = await connection.query(
        `SELECT id, requester_name, status, created_at 
         FROM e_video_requests 
         ORDER BY created_at DESC 
         LIMIT 5`
      );

      // Process e-video requests by status
      const requestsByStatus: any = {
        new: 0,
        in_progress: 0,
        done: 0,
        cancelled: 0,
      };
      
      (eVideoRequestsResult as any[]).forEach((row: any) => {
        requestsByStatus[row.status] = row.count;
      });

      // Get time-series data for user growth (last 7 days)
      const [userGrowth] = await connection.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count 
         FROM users 
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(created_at) 
         ORDER BY date ASC`
      );

      // Get time-series data for cards created (last 7 days)
      const [cardsCreated] = await connection.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count 
         FROM user_ecards 
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(created_at) 
         ORDER BY date ASC`
      );

      // Get template usage statistics
      const [templateUsage] = await connection.query(
        `SELECT t.name, COUNT(ue.id) as usage_count 
         FROM templates t 
         LEFT JOIN user_ecards ue ON t.id = ue.template_id 
         WHERE t.is_active = 1 
         GROUP BY t.id, t.name 
         ORDER BY usage_count DESC 
         LIMIT 10`
      );

      // Get category distribution for templates
      const [categoryDistribution] = await connection.query(
        `SELECT cc.name, COUNT(t.id) as count 
         FROM card_categories cc 
         LEFT JOIN templates t ON cc.id = t.category_id AND t.is_active = 1
         WHERE cc.status = 1
         GROUP BY cc.id, cc.name 
         ORDER BY count DESC`
      );

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
            totalUsers: (usersResult as any).count || 0,
            totalTemplates: (templatesResult as any).count || 0,
            totalUserCards: (userEcardsResult as any).count || 0,
            totalEVideoTemplates: (eVideoTemplatesResult as any).count || 0,
            totalCategories: (categoriesResult as any).count || 0,
            totalVideoCategories: (videoCategoriesResult as any).count || 0,
            eVideoRequests: requestsByStatus,
            recentCards: recentCards || [],
            recentRequests: recentRequests || [],
            userGrowth: userGrowth || [],
            cardsCreated: cardsCreated || [],
            templateUsage: templateUsage || [],
            categoryDistribution: categoryDistribution || [],
          },
        },
        { status: 200 }
      );
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
});
