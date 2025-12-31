import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { slugify } from '@/lib/utils';
import crypto from 'crypto';

// GET list of user ecards
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    const where = userId ? 'WHERE user_id = ?' : '';
    const params = userId ? [userId] : [];

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, template_id, user_id, user_name, public_slug, preview_url, preview_urls, created_at
       FROM user_ecards
       ${where}
       ORDER BY created_at DESC
       LIMIT 50`,
      params
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching user ecards:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user ecards' },
      { status: 500 }
    );
  }
}

// POST create a new user ecard (preview optional; supports multipage preview_urls)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template_id, user_name, user_id, customized_data, preview_uri, preview_urls } = body;

    if (!template_id || !customized_data) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch template name to build slug part
    const [templates] = await pool.query<RowDataPacket[]>(
      'SELECT name FROM templates WHERE id = ? LIMIT 1',
      [template_id]
    );
    const templateName = (templates[0]?.name as string | undefined) || 'card';
    const base = slugify(templateName);

    // Generate random digits for uniqueness
    const randomDigits = (len = 8) => {
      const bytes = crypto.randomBytes(len);
      return Array.from(bytes).map(b => (b % 10).toString()).join('').slice(0, len);
    };

    let publicSlug = `${base}-${randomDigits(8)}`;
    // Ensure uniqueness (try a couple of times)
    for (let i = 0; i < 3; i++) {
      const [exists] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM user_ecards WHERE public_slug = ? LIMIT 1',
        [publicSlug]
      );
      if (!exists.length) break;
      publicSlug = `${base}-${randomDigits(10)}`;
    }

    const primaryPreview = Array.isArray(preview_urls) && preview_urls.length > 0
      ? preview_urls[0]
      : preview_uri || null;

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO user_ecards (template_id, user_id, user_name, customized_data, preview_url, preview_urls, public_slug) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        template_id,
        user_id || null,
        user_name || null,
        JSON.stringify(customized_data),
        primaryPreview,
        preview_urls ? JSON.stringify(preview_urls) : null,
        publicSlug,
      ]
    );

    return NextResponse.json({
      success: true,
      data: { id: result.insertId, slug: publicSlug },
    });
  } catch (error) {
    console.error('Error creating user ecard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user ecard' },
      { status: 500 }
    );
  }
}
