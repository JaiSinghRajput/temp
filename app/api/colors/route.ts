import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET all colors
export async function GET() {
  try {
    const [colors] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, hex_code FROM color ORDER BY id'
    );
    return NextResponse.json({
      success: true,
      data: colors,
    });
  } catch (error: any) {
    console.error('Error fetching colors:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST create new color
export async function POST(request: NextRequest) {
  try {
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
      'INSERT INTO color (name, hex_code) VALUES (?, ?)',
      [name, hex_code]
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.insertId,
          name,
          hex_code,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Color name or hex code already exists' },
        { status: 400 }
      );
    }
    console.error('Error creating color:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
