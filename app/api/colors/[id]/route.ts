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
      `SELECT 
         id, 
         url AS hex_code,
         JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.name')) AS name
       FROM content_assets 
       WHERE id = ? AND asset_type = 'color'`,
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
      `UPDATE content_assets SET url = ?, metadata = JSON_OBJECT('name', ?) WHERE id = ? AND asset_type = 'color'`,
      [hex_code, name, id]
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
      `DELETE FROM content_assets WHERE id = ? AND asset_type = 'color'`,
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
