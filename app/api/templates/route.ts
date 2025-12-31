import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Safely parse JSON fields coming from MySQL JSON columns
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

// GET all templates
export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, cc.name AS category_name, cs.name AS subcategory_name
       FROM templates t
       LEFT JOIN card_categories cc ON cc.id = t.category_id
       LEFT JOIN card_subcategories cs ON cs.id = t.subcategory_id
       WHERE t.is_active = TRUE
       ORDER BY t.created_at DESC`
    );

    const data = rows.map((row) => {
      const canvasData = safeParseJSON((row as any).canvas_data, {});
      const pages = safeParseJSON((row as any).pages, canvasData.pages || null);
      return {
        ...row,
        canvas_data: canvasData,
        pages,
        is_multipage: (row as any).is_multipage ?? Boolean(pages),
        thumbnail_uri: (row as any).thumbnail_url ?? null,
        thumbnail_public_id: (row as any).thumbnail_public_id ?? null,
        category_name: (row as any).category_name ?? null,
        subcategory_name: (row as any).subcategory_name ?? null,
      };
    });

    return NextResponse.json({ success: true, data });
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
    const { name, description, template_image_url, canvas_data, cloudinary_public_id, thumbnail_uri, thumbnail_public_id, category_id, subcategory_id, is_multipage, pricing_type, price } = body;

    const normalizedCanvasData = canvas_data || {};
    const pages = normalizedCanvasData.pages || null;
    const isMultipageFlag = Boolean(is_multipage || pages);

    if (!name || !template_image_url || !canvas_data) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO templates (name, description, template_image_url, canvas_data, pages, is_multipage, thumbnail_url, thumbnail_public_id, cloudinary_public_id, category_id, subcategory_id, pricing_type, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        description || null,
        template_image_url,
        JSON.stringify(normalizedCanvasData),
        pages ? JSON.stringify(pages) : null,
        isMultipageFlag,
        thumbnail_uri || null,
        thumbnail_public_id || null,
        cloudinary_public_id || null,
        category_id || 1,
        subcategory_id || null,
        pricing_type || 'free',
        pricing_type === 'premium' ? parseFloat(price) || 0 : 0,
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertId,
        name,
        description,
        template_image_url,
        canvas_data: normalizedCanvasData,
        pages,
        is_multipage: isMultipageFlag,
        thumbnail_uri: thumbnail_uri || null,
        thumbnail_public_id: thumbnail_public_id || null,
        category_id: category_id || 1,
        subcategory_id: subcategory_id || null,
      }
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
