import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { slugify } from '@/lib/utils';

export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, slug, description, status, created_at, updated_at FROM video_categories ORDER BY created_at DESC'
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching video categories:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch video categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description } = body as { name?: string; description?: string | null };

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const slug = slugify(name.trim());

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO video_categories (name, slug, description, status) VALUES (?, ?, ?, 1)',
      [name.trim(), slug, description?.trim() || null]
    );

    return NextResponse.json({ success: true, data: { id: result.insertId, name, slug } });
  } catch (error) {
    console.error('Error creating video category:', error);
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 });
  }
}