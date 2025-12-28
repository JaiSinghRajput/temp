import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET single template by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM templates WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PUT update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, template_image_url, canvas_data, thumbnail_url, is_active, cloudinary_public_id, old_public_id } = body;

    // Delete old Cloudinary image if a new one is uploaded
    if (old_public_id && cloudinary_public_id && old_public_id !== cloudinary_public_id) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/uploads/cloudinary/${encodeURIComponent(old_public_id)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Failed to delete old Cloudinary image:', err);
      }
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE templates SET name = ?, description = ?, template_image_url = ?, canvas_data = ?, thumbnail_url = ?, is_active = ?, cloudinary_public_id = ? WHERE id = ?',
      [
        name,
        description || null,
        template_image_url,
        JSON.stringify(canvas_data),
        thumbnail_url || null,
        is_active !== undefined ? is_active : true,
        cloudinary_public_id || null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Template updated successfully' });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE template (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get the template to find the publicId
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT cloudinary_public_id FROM templates WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const publicId = rows[0].cloudinary_public_id;

    // Delete from Cloudinary if exists
    if (publicId) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/uploads/cloudinary/${encodeURIComponent(publicId)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Failed to delete Cloudinary image:', err);
      }
    }

    // Soft delete in database
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE templates SET is_active = FALSE WHERE id = ?',
      [id]
    );

    return NextResponse.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
