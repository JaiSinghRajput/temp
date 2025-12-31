import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, font_name, cdn_link, created_at FROM FONT_CDN_LINKS WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Font not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching font CDN link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch font CDN link' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    try {
      new URL(cdn_link);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: 'CDN link must be a valid URL' },
        { status: 400 }
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE FONT_CDN_LINKS SET font_name = ?, cdn_link = ? WHERE id = ?',
      [font_name.trim(), cdn_link.trim(), id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Font not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Font updated successfully' });
  } catch (error: any) {
    console.error('Error updating font CDN link:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Font name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update font CDN link' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM FONT_CDN_LINKS WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Font not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Font deleted successfully' });
  } catch (error) {
    console.error('Error deleting font CDN link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete font CDN link' },
      { status: 500 }
    );
  }
}
