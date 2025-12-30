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
      'SELECT id, category_id, name, slug, status, created_at FROM card_subcategories WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching subcategory:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch subcategory' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, slug, status } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Subcategory name is required' },
        { status: 400 }
      );
    }

    const finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-');

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE card_subcategories SET name = ?, slug = ?, status = ? WHERE id = ?',
      [name.trim(), finalSlug, status !== undefined ? status : 1, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Subcategory updated successfully' });
  } catch (error: any) {
    console.error('Error updating subcategory:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Subcategory name already exists in this category' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update subcategory' },
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
      'DELETE FROM card_subcategories WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Subcategory deleted successfully' });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete subcategory' },
      { status: 500 }
    );
  }
}
