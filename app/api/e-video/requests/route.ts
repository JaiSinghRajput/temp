import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '@/lib/db';

const safeParse = <T>(value: any, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch (err) {
    console.error('Failed to parse JSON field:', err);
    return fallback;
  }
};

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    const status = request.nextUrl.searchParams.get('status');
    const templateId = request.nextUrl.searchParams.get('templateId');
    const cardId = request.nextUrl.searchParams.get('cardId');
    const userId = request.nextUrl.searchParams.get('userId');
    const dateFrom = request.nextUrl.searchParams.get('from');
    const dateTo = request.nextUrl.searchParams.get('to');

    const filters: string[] = [];
    const params: (string | number)[] = [];

    if (id) {
      filters.push('ucc.id = ?');
      params.push(Number(id));
    }

    if (status) {
      filters.push('ucc.status = ?');
      params.push(status);
    }

    // paymentStatus filter skipped because user_custom_content does not store payment_status

    if (templateId) {
      filters.push('ucc.content_id = ?');
      params.push(Number(templateId));
    }

    if (cardId) {
      filters.push('ucc.id = ?');
      params.push(Number(cardId));
    }

    if (userId) {
      filters.push('ucc.user_id = ?');
      params.push(userId);
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (dateFrom) {
      if (!dateRegex.test(dateFrom)) {
        return NextResponse.json(
          { success: false, error: 'Invalid from date format. Use YYYY-MM-DD.' },
          { status: 400 }
        );
      }
      filters.push('DATE(ucc.created_at) >= ?');
      params.push(dateFrom);
    }

    if (dateTo) {
      if (!dateRegex.test(dateTo)) {
        return NextResponse.json(
          { success: false, error: 'Invalid to date format. Use YYYY-MM-DD.' },
          { status: 400 }
        );
      }
      filters.push('DATE(ucc.created_at) <= ?');
      params.push(dateTo);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         ucc.id,
         ucc.content_id,
         ucc.user_id,
         ucc.custom_data,
         ucc.preview_url,
         ucc.status,
         ucc.created_at,
         MAX(ci.title) AS template_title, 
         MAX(ci.slug) AS template_slug, 
         MAX(p.price) AS template_price,
         GROUP_CONCAT(DISTINCT c_main.slug) AS template_category_slug,
         GROUP_CONCAT(DISTINCT c_sub.slug) AS template_subcategory_slug
       FROM user_custom_content ucc
       JOIN content_items ci ON ci.id = ucc.content_id AND ci.type = 'video'
       LEFT JOIN video_templates vt ON vt.content_id = ci.id
       LEFT JOIN products p ON p.content_id = ci.id
       LEFT JOIN category_links cl_main ON cl_main.target_id = ci.id AND cl_main.target_type = 'content'
       LEFT JOIN categories c_main ON c_main.id = cl_main.category_id AND c_main.parent_id IS NULL
       LEFT JOIN category_links cl_sub ON cl_sub.target_id = ci.id AND cl_sub.target_type = 'content'
       LEFT JOIN categories c_sub ON c_sub.id = cl_sub.category_id AND c_sub.parent_id IS NOT NULL
       ${whereClause}
       GROUP BY ucc.id
       ORDER BY ucc.created_at DESC`,
      params
    );

    const data = rows.map((row) => {
      const price = (row as any).template_price;
      const parsedPrice = price !== null && price !== undefined ? Number(price) : null;
      return {
        ...(row as any),
        template_price: parsedPrice,
        template_pricing_type: parsedPrice && parsedPrice > 0 ? 'premium' : 'free',
        template_category_slug: (row as any).template_category_slug || null,
        template_subcategory_slug: (row as any).template_subcategory_slug || null,
        payload: safeParse<Record<string, any>>((row as any).custom_data, {}),
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching video requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch video requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      template_id,
      card_id,
      user_id,
      requester_name,
      requester_email,
      requester_phone,
      payload,
      status,
    } = body as {
      template_id?: number;
      card_id?: number | null;
      user_id?: string | null;
      requester_name?: string;
      requester_email?: string;
      requester_phone?: string;
      payload?: Record<string, any>;
      status?: string;
    };

    const allowedStatuses = ['draft', 'submitted', 'paid', 'completed'];
    const finalStatus = status && allowedStatuses.includes(status) ? status : 'draft';

    console.log('📥 [POST /api/e-video/requests] Received:', {
      template_id,
      user_id,
      requester_name,
      status: finalStatus,
      payloadKeys: payload ? Object.keys(payload) : [],
      payloadSize: payload ? JSON.stringify(payload).length : 0,
    });

    if (!template_id || !requester_name || !payload) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: template_id, requester_name, payload' },
        { status: 400 }
      );
    }

    const [templateRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM content_items WHERE id = ? AND type = ? LIMIT 1',
      [template_id, 'video']
    );

    if (templateRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Video template not found' },
        { status: 404 }
      );
    }

    // Check if user_id exists in users table (to satisfy foreign key constraint)
    let validUserId: string | null = null;
    if (user_id) {
      const [userRows] = await pool.query<RowDataPacket[]>(
        'SELECT uid FROM users WHERE uid = ? LIMIT 1',
        [user_id]
      );
      if (userRows.length > 0) {
        validUserId = user_id;
      }
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO user_custom_content
        (content_id, user_id, custom_data, status)
       VALUES (?, ?, ?, ?)` ,
      [
        template_id,
        validUserId,
        JSON.stringify({
          ...payload,
          requester_name,
          requester_email: requester_email || null,
          requester_phone: requester_phone || null,
        }),
        finalStatus,
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertId,
        template_id,
        card_id: card_id ?? null,
        user_id: user_id ?? null,
        requester_name,
        requester_email: requester_email || null,
        requester_phone: requester_phone || null,
        payload,
        status: finalStatus,
      },
    });
  } catch (error) {
    console.error('Error creating e-video request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create e-video request' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      status,
      payload,
      requester_name,
      requester_email,
      requester_phone,
    } = body as {
      id?: number;
      status?: 'draft' | 'submitted' | 'paid' | 'completed' | 'cancelled';
      payload?: Record<string, any>;
      requester_name?: string;
      requester_email?: string | null;
      requester_phone?: string | null;
    };

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM user_custom_content WHERE id = ? LIMIT 1',
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    const nextStatus = status ?? 'draft';

    if (!['draft', 'submitted', 'paid', 'completed', 'cancelled'].includes(nextStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // If payload provided, overwrite custom_data with merged requester info
    if (payload) {
      await pool.query<ResultSetHeader>(
        `UPDATE user_custom_content
         SET status = ?, custom_data = ?
         WHERE id = ?` ,
        [
          nextStatus,
          JSON.stringify({
            ...payload,
            requester_name,
            requester_email: requester_email ?? null,
            requester_phone: requester_phone ?? null,
          }),
          id,
        ]
      );
    } else {
      await pool.query<ResultSetHeader>(
        `UPDATE user_custom_content
         SET status = ?
         WHERE id = ?` ,
        [nextStatus, id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating e-video request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update e-video request' },
      { status: 500 }
    );
  }
}
