import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET single color
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [colors] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, hex_code FROM color WHERE id = ?',
      [id]
    );

    if (colors.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Color not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: colors[0],
    });
  } catch (error: any) {
    console.error('Error fetching color:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT update color
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, hex_code } = await request.json();

    if (!name || !hex_code) {
      return NextResponse.json(
        { success: false, error: 'Name and hex_code are required' },
        { status: 400 }
      );
    }

    // Validate hex code format
    if (!/^#[0-9A-F]{6}$/i.test(hex_code)) {
      return NextResponse.json(
        { success: false, error: 'Invalid hex code format. Use #RRGGBB' },
        { status: 400 }
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE color SET name = ?, hex_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, hex_code, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Color not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: parseInt(id), name, hex_code },
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Color name or hex code already exists' },
        { status: 400 }
      );
    }
    console.error('Error updating color:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE color
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM color WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Color not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Color deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting color:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
