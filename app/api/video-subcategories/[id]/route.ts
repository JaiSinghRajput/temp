import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM video_subcategories WHERE id = ?', [id]);
    if ((result as ResultSetHeader).affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Subcategory not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting video subcategory:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete subcategory' }, { status: 500 });
  }
}