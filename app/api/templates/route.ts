import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET all templates
export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM templates WHERE is_active = TRUE ORDER BY created_at DESC'
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST create new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, template_image_url, canvas_data, thumbnail_url, cloudinary_public_id } = body;

    if (!name || !template_image_url || !canvas_data) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO templates (name, description, template_image_url, canvas_data, thumbnail_url, cloudinary_public_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description || null, template_image_url, JSON.stringify(canvas_data), thumbnail_url || null, cloudinary_public_id || null]
    );

    return NextResponse.json({
      success: true,
      data: { id: result.insertId, name, description, template_image_url, canvas_data, thumbnail_url }
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
