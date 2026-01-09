import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { slugify } from '@/lib/utils';

// GET all colors (stored as content_assets)
export async function GET() {
  try {
    const [colors] = await pool.query<RowDataPacket[]>(
      `SELECT 
         id, 
         url AS hex_code,
         JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.name')) AS name
       FROM content_assets 
       WHERE asset_type = 'color' 
       ORDER BY id`
    );
    return NextResponse.json({
      success: true,
      data: colors || [],
    });
  } catch (error: any) {
    console.error('Error fetching colors:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST create new color
export async function POST(request: NextRequest) {
  try {
    const { name, hex_code } = await request.json();

    if (!name || !hex_code) {
      return NextResponse.json(
        { success: false, error: 'Name and hex_code are required' },
        { status: 400 }
      );
    }

    // Validate hex code format
    if (!/^#[0-9A-F]{6}$/i.test(hex_code)) {
      return NextResponse.json(
        { success: false, error: 'Invalid hex code format. Use #RRGGBB' },
        { status: 400 }
      );
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const title = name.trim();
      const slug = slugify(title);

      const [contentResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO content_items (type, title, slug, description, is_active) VALUES ('ecard', ?, ?, NULL, TRUE)`,
        [title, slug]
      );

      const contentId = contentResult.insertId;

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO content_assets (content_id, asset_type, url, metadata) VALUES (?, 'color', ?, JSON_OBJECT('name', ?))`,
        [contentId, hex_code, title]
      );

      await conn.commit();

      return NextResponse.json(
        {
          success: true,
          data: {
            id: result.insertId,
            name: title,
            hex_code,
          },
        },
        { status: 201 }
      );
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Color name or hex code already exists' },
        { status: 400 }
      );
    }
    console.error('Error creating color:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
