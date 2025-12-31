import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, template_id, user_name, customized_data, preview_url, preview_urls, created_at FROM user_ecards WHERE public_slug = ?',
      [slug]
    );

    if (!rows.length) {
      return NextResponse.json(
        { success: false, error: 'Card not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching user ecard by slug:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user ecard' },
      { status: 500 }
    );
  }
}
