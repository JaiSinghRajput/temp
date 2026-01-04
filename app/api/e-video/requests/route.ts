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
    const status = request.nextUrl.searchParams.get('status');
    const paymentStatus = request.nextUrl.searchParams.get('paymentStatus');
    const templateId = request.nextUrl.searchParams.get('templateId');
    const cardId = request.nextUrl.searchParams.get('cardId');
    const userId = request.nextUrl.searchParams.get('userId');
    const dateFrom = request.nextUrl.searchParams.get('from');
    const dateTo = request.nextUrl.searchParams.get('to');

    const filters: string[] = [];
    const params: (string | number)[] = [];

    if (status) {
      filters.push('r.status = ?');
      params.push(status);
    }

    if (paymentStatus && ['pending', 'paid'].includes(paymentStatus)) {
      filters.push('r.payment_status = ?');
      params.push(paymentStatus);
    }

    if (templateId) {
      filters.push('r.template_id = ?');
      params.push(Number(templateId));
    }

    if (cardId) {
      filters.push('r.card_id = ?');
      params.push(Number(cardId));
    }

    if (userId) {
      filters.push('r.user_id = ?');
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
      filters.push('DATE(r.created_at) >= ?');
      params.push(dateFrom);
    }

    if (dateTo) {
      if (!dateRegex.test(dateTo)) {
        return NextResponse.json(
          { success: false, error: 'Invalid to date format. Use YYYY-MM-DD.' },
          { status: 400 }
        );
      }
      filters.push('DATE(r.created_at) <= ?');
      params.push(dateTo);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT r.*, t.title AS template_title, t.slug AS template_slug, t.price AS template_price,
              CASE WHEN t.price IS NULL OR t.price = 0 THEN 'free' ELSE 'premium' END AS template_pricing_type,
              c.card_image_url
       FROM e_video_requests r
       JOIN e_video_templates t ON t.id = r.template_id
       LEFT JOIN e_video_cards c ON c.id = r.card_id
       ${whereClause}
       ORDER BY r.created_at DESC`,
      params
    );

    const data = rows.map((row) => ({
      ...(row as any),
      payload: safeParse<Record<string, any>>((row as any).payload, {}),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching e-video requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch e-video requests' },
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

    const allowedStatuses = ['new', 'in_progress', 'done', 'cancelled', 'draft'];
    const finalStatus = status && allowedStatuses.includes(status) ? status : 'new';

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
      'SELECT id FROM e_video_templates WHERE id = ? LIMIT 1',
      [template_id]
    );

    if (templateRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    if (card_id) {
      const [cardRows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM e_video_cards WHERE id = ? AND template_id = ? LIMIT 1',
        [card_id, template_id]
      );

      if (cardRows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Card not found for template' },
          { status: 404 }
        );
      }
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
      `INSERT INTO e_video_requests
        (template_id, card_id, user_id, requester_name, requester_email, requester_phone, payload, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        template_id,
        card_id ?? null,
        validUserId,
        requester_name,
        requester_email || null,
        requester_phone || null,
        JSON.stringify(payload),
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
        status: 'new',
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
    const { id, status, admin_notes } = body as {
      id?: number;
      status?: 'new' | 'in_progress' | 'done' | 'cancelled';
      admin_notes?: string | null;
    };

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, status' },
        { status: 400 }
      );
    }

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM e_video_requests WHERE id = ? LIMIT 1',
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    await pool.query<ResultSetHeader>(
      `UPDATE e_video_requests
       SET status = ?, admin_notes = ?
       WHERE id = ?` ,
      [status, admin_notes ?? null, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating e-video request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update e-video request' },
      { status: 500 }
    );
  }
}
