import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, font_name, cdn_link, created_at FROM FONT_CDN_LINKS ORDER BY font_name ASC'
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

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO FONT_CDN_LINKS (font_name, cdn_link) VALUES (?, ?)',
      [font_name.trim(), cdn_link.trim()]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertId,
        font_name: font_name.trim(),
        cdn_link: cdn_link.trim(),
      },
    });
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
