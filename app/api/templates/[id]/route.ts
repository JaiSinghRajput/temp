import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const safeParseJSON = <T>(value: any, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch (err) {
    console.error('Failed to parse JSON field:', err);
    return fallback;
  }
};

// GET single template by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, cc.name AS category_name, cs.name AS subcategory_name
       FROM templates t
       LEFT JOIN card_categories cc ON cc.id = t.category_id
       LEFT JOIN card_subcategories cs ON cs.id = t.subcategory_id
       WHERE t.id = ? AND t.is_active = TRUE`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const row = rows[0];
    const canvasData = safeParseJSON((row as any).canvas_data, {});
    const pages = safeParseJSON((row as any).pages, canvasData.pages || null);

    return NextResponse.json({
      success: true,
      data: {
        ...row,
        canvas_data: canvasData,
        pages,
        is_multipage: (row as any).is_multipage ?? Boolean(pages),
        thumbnail_uri: (row as any).thumbnail_url ?? null,
        thumbnail_public_id: (row as any).thumbnail_public_id ?? null,
        category_name: (row as any).category_name ?? null,
        subcategory_name: (row as any).subcategory_name ?? null,
      },
    });
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
    const { name, description, template_image_url, canvas_data, is_active, cloudinary_public_id, old_public_id, thumbnail_uri, thumbnail_public_id, old_thumbnail_public_id, category_id, subcategory_id, is_multipage } = body;

    const normalizedCanvasData = canvas_data || {};
    const pages = normalizedCanvasData.pages || body.pages || null;
    const isMultipageFlag = is_multipage !== undefined ? Boolean(is_multipage) : Boolean(pages);

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

    // Delete old thumbnail if a new one is uploaded
    if (old_thumbnail_public_id && thumbnail_public_id && old_thumbnail_public_id !== thumbnail_public_id) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/uploads/cloudinary/${encodeURIComponent(old_thumbnail_public_id)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Failed to delete old Cloudinary thumbnail:', err);
      }
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE templates SET name = ?, description = ?, template_image_url = ?, canvas_data = ?, pages = ?, is_multipage = ?, thumbnail_url = ?, thumbnail_public_id = ?, is_active = ?, cloudinary_public_id = ?, category_id = ?, subcategory_id = ? WHERE id = ?',
      [
        name,
        description || null,
        template_image_url,
        JSON.stringify(normalizedCanvasData),
        pages ? JSON.stringify(pages) : null,
        isMultipageFlag,
        thumbnail_uri || null,
        thumbnail_public_id || null,
        is_active !== undefined ? is_active : true,
        cloudinary_public_id || null,
        category_id || 1,
        subcategory_id || null,
        id,
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
      'SELECT cloudinary_public_id, thumbnail_public_id FROM templates WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const publicId = rows[0].cloudinary_public_id;
    const thumbPublicId = (rows[0] as any).thumbnail_public_id as string | null;

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

    // Delete thumbnail if exists
    if (thumbPublicId) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/uploads/cloudinary/${encodeURIComponent(thumbPublicId)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Failed to delete Cloudinary thumbnail:', err);
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
