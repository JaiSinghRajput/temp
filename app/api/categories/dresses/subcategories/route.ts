import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { slugify } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const categoryId = req.nextUrl.searchParams.get('category_id');
    const where = categoryId ? "WHERE parent_id = ? AND category_type = 'dresses'" : "WHERE parent_id IS NOT NULL AND category_type = 'dresses'";
    const params = categoryId ? [categoryId] : [];

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, parent_id as category_id, name, slug, is_active as status FROM categories ${where} ORDER BY id DESC`,
      params
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching dresses subcategories:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch dresses subcategories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category_id, name, slug } = body as {
      category_id?: number;
      name?: string;
      slug?: string;
    };

    if (!category_id || !name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'category_id and name are required' },
        { status: 400 }
      );
    }

    const finalSlug = slug ? slugify(slug) : slugify(name);

    // ✅ CHECK: same slug under same parent
    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM categories 
       WHERE parent_id = ? AND slug = ? AND category_type = 'dresses'`,
      [category_id, finalSlug]
    );

    if (existing.length) {
      return NextResponse.json(
        { success: false, error: 'Subcategory already exists in this category' },
        { status: 409 }
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO categories 
       (parent_id, name, slug, category_type, is_active) 
       VALUES (?, ?, ?, 'dresses', 1)`,
      [category_id, name.trim(), finalSlug]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertId,
        name: name.trim(),
        slug: finalSlug,
        category_id,
      },
    });
  } catch (error) {
    console.error('Error creating dresses subcategory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create subcategory' },
      { status: 500 }
    );
  }
}
