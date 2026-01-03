import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { slugify } from '@/lib/utils';

export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, description, status, created_at FROM card_categories ORDER BY name ASC'
    );

    const shaped = rows.map((row) => ({
      ...row,
      slug: slugify(String((row as any).name || '')),
    }));

    return NextResponse.json({ success: true, data: shaped });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO card_categories (name, description, status) VALUES (?, ?, 1)',
      [name.trim(), description || null]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertId,
        name,
        description: description || null,
        status: 1,
        slug: slugify(name),
      },
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Category name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
