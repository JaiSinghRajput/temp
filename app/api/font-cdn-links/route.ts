import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { slugify } from '@/lib/utils';

export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, JSON_EXTRACT(metadata, '$.font_name') as font_name, url as cdn_link, created_at FROM content_assets WHERE asset_type = 'font' ORDER BY JSON_EXTRACT(metadata, '$.font_name') ASC`
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching font CDN links:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch font CDN links' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { font_name, cdn_link } = await request.json();

    if (!font_name || !font_name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Font name is required' },
        { status: 400 }
      );
    }

    if (!cdn_link || !cdn_link.trim()) {
      return NextResponse.json(
        { success: false, error: 'CDN link is required' },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      new URL(cdn_link);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: 'CDN link must be a valid URL' },
        { status: 400 }
      );
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const title = font_name.trim();
      const slug = slugify(title);

      const [contentResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO content_items (type, title, slug, description, is_active) VALUES ('ecard', ?, ?, NULL, TRUE)`,
        [title, slug]
      );

      const contentId = contentResult.insertId;

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO content_assets (content_id, asset_type, url, metadata) VALUES (?, 'font', ?, JSON_OBJECT('font_name', ?))`,
        [contentId, cdn_link.trim(), title]
      );

      await conn.commit();

      return NextResponse.json({
        success: true,
        data: {
          id: result.insertId,
          font_name: title,
          cdn_link: cdn_link.trim(),
        },
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    console.error('Error creating font CDN link:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Font name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create font CDN link' },
      { status: 500 }
    );
  }
}
