import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id');

    let rows: RowDataPacket[];
    if (categoryId) {
      const [result] = await pool.query<RowDataPacket[]>(
        "SELECT id, parent_id as category_id, name, slug, is_active as status FROM categories WHERE parent_id = ? AND category_type = 'card' ORDER BY name ASC",
        [Number(categoryId)]
      );
      rows = result;
    } else {
      const [result] = await pool.query<RowDataPacket[]>(
        "SELECT id, parent_id as category_id, name, slug, is_active as status FROM categories WHERE parent_id IS NOT NULL AND category_type = 'card' ORDER BY name ASC"
      );
      rows = result;
    }

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch subcategories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { category_id, name, slug } = await request.json();

    if (!category_id || !name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Category ID and subcategory name are required' },
        { status: 400 }
      );
    }

    const finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-');

    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO categories (parent_id, name, slug, category_type, is_active) VALUES (?, ?, ?, 'card', 1)",
      [category_id, name.trim(), finalSlug]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertId,
        category_id,
        name,
        slug: finalSlug,
        status: 1,
      },
    });
  } catch (error: any) {
    console.error('Error creating subcategory:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Subcategory name already exists in this category' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create subcategory' },
      { status: 500 }
    );
  }
}
