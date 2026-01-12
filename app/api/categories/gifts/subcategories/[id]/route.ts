import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [result] = await pool.query<ResultSetHeader>("DELETE FROM categories WHERE id = ? AND parent_id IS NOT NULL AND category_type = 'gifts'", [id]);
    if ((result as ResultSetHeader).affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Subcategory not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting gifts subcategory:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete subcategory' }, { status: 500 });
  }
}