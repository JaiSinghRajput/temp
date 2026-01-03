import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { slugify } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const categoryId = req.nextUrl.searchParams.get('category_id');
    const where = categoryId ? 'WHERE category_id = ?' : '';
    const params = categoryId ? [categoryId] : [];

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, category_id, name, slug, status, created_at, updated_at FROM video_subcategories ${where} ORDER BY created_at DESC`,
      params
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching video subcategories:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch video subcategories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category_id, name, slug } = body as { category_id?: number; name?: string; slug?: string };

    if (!category_id || !name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'category_id and name are required' }, { status: 400 });
    }

    const finalSlug = slug ? slugify(slug) : slugify(name);

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO video_subcategories (category_id, name, slug, status) VALUES (?, ?, ?, 1)',
      [category_id, name.trim(), finalSlug]
    );

    return NextResponse.json({ success: true, data: { id: result.insertId, name, slug: finalSlug, category_id } });
  } catch (error) {
    console.error('Error creating video subcategory:', error);
    return NextResponse.json({ success: false, error: 'Failed to create subcategory' }, { status: 500 });
  }
}