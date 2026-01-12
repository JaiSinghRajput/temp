import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { slugify } from '@/lib/utils';

// GET all parent categories (ecard, video, etc.)
export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, slug, is_active
       FROM categories 
       WHERE parent_id IS NULL AND category_type = 'card'
       ORDER BY name ASC`
    );

    const shaped = rows.map((row) => ({
      id: (row as any).id,
      name: (row as any).name,
      slug: (row as any).slug,
      is_active: (row as any).is_active,
    }));

    return NextResponse.json({ success: true, data: shaped });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST create a new parent category
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    const slug = slugify(name.trim());

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO categories (name, slug, category_type, parent_id, is_active)
       VALUES (?, ?, 'card', NULL, ?)`
      , [name.trim(), slug, true]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertId,
        name,
        slug,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Category slug already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
