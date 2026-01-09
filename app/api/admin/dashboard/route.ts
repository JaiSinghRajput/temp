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
      const [[usersResult], [ecardTemplatesResult], [userCustomContentResult], [videoTemplatesResult], [categoriesResult]] = await Promise.all([
        connection.query('SELECT COUNT(*) as count FROM users WHERE status = TRUE'),
        connection.query('SELECT COUNT(*) as count FROM content_items WHERE type = ? AND is_active = ?', ['ecard', true]),
        connection.query('SELECT COUNT(*) as count FROM user_custom_content WHERE status = ?', ['paid']),
        connection.query('SELECT COUNT(*) as count FROM content_items WHERE type = ? AND is_active = ?', ['video', true]),
        connection.query('SELECT COUNT(*) as count FROM categories WHERE parent_id IS NULL'),
      ]);

      // Get recent user custom content
      const [recentContent] = await connection.query(
        `SELECT ucc.id, ucc.user_id, ci.title as content_title, ucc.status, ucc.created_at 
         FROM user_custom_content ucc 
         LEFT JOIN content_items ci ON ucc.content_id = ci.id
         ORDER BY ucc.created_at DESC 
         LIMIT 5`
      );

      // Get order summary
      const [orderStats] = await connection.query(
        `SELECT status, COUNT(*) as count 
         FROM orders 
         GROUP BY status`
      );

      // Get time-series data for user growth (last 7 days)
      const [userGrowth] = await connection.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count 
         FROM users 
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(created_at) 
         ORDER BY date ASC`
      );

      // Get time-series data for custom content created (last 7 days)
      const [contentCreated] = await connection.query(
        `SELECT DATE(ucc.created_at) as date, COUNT(*) as count 
         FROM user_custom_content ucc
         WHERE ucc.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(ucc.created_at) 
         ORDER BY date ASC`
      );

      // Get content usage statistics
      const [contentUsage] = await connection.query(
        `SELECT ci.title, ci.type, COUNT(ucc.id) as usage_count 
         FROM content_items ci 
         LEFT JOIN user_custom_content ucc ON ci.id = ucc.content_id 
         WHERE ci.is_active = TRUE
         GROUP BY ci.id, ci.title, ci.type 
         ORDER BY usage_count DESC 
         LIMIT 10`
      );

      // Get category distribution for content
      const [categoryDistribution] = await connection.query(
        `SELECT cat.name, cat.slug, COUNT(ci.id) as count, ci.type
         FROM categories cat
         LEFT JOIN category_links cl ON cat.id = cl.category_id AND cl.target_type = 'content'
         LEFT JOIN content_items ci ON cl.target_id = ci.id AND ci.is_active = TRUE
         WHERE cat.parent_id IS NULL
         GROUP BY cat.id, cat.name, cat.slug, ci.type
         ORDER BY count DESC`
      );

      // Process order stats
      const ordersByStatus: any = {
        pending: 0,
        paid: 0,
        processing: 0,
        shipped: 0,
        completed: 0,
        cancelled: 0,
        refunded: 0,
      };
      
      (orderStats as any[]).forEach((row: any) => {
        if (row.status in ordersByStatus) {
          ordersByStatus[row.status] = row.count;
        }
      });

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
            totalEcardTemplates: (ecardTemplatesResult as any).count || 0,
            totalUserContent: (userCustomContentResult as any).count || 0,
            totalVideoTemplates: (videoTemplatesResult as any).count || 0,
            totalCategories: (categoriesResult as any).count || 0,
            orderStats: ordersByStatus,
            recentContent: recentContent || [],
            userGrowth: userGrowth || [],
            contentCreated: contentCreated || [],
            contentUsage: contentUsage || [],
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
