import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { slugify } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, slug, parent_id, is_active FROM categories WHERE id = ? AND category_type = "card"',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch category' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, is_active } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    const slug = slugify(name.trim());

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE categories SET name = ?, slug = ?, is_active = ? WHERE id = ? AND parent_id IS NULL AND category_type = "card"`,
      [name.trim(), slug, is_active !== undefined ? is_active : true, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Category updated successfully' });
  } catch (error: any) {
    console.error('Error updating category:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Category slug already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
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
      'DELETE FROM categories WHERE id = ? AND parent_id IS NULL AND category_type = "card"',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
