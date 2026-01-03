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
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id');
    const subcategoryId = searchParams.get('subcategory_id');

    const filters: string[] = ['t.is_active = TRUE'];
    const params: any[] = [];

    if (categoryId) {
      filters.push('t.category_id = ?');
      params.push(Number(categoryId));
    }

    if (subcategoryId) {
      filters.push('t.subcategory_id = ?');
      params.push(Number(subcategoryId));
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, cc.name AS category_name, cs.name AS subcategory_name, b.cloudinary_url AS background_url
       FROM templates t
       LEFT JOIN card_categories cc ON cc.id = t.category_id
       LEFT JOIN card_subcategories cs ON cs.id = t.subcategory_id
       LEFT JOIN backgrounds b ON t.background_id = b.id
       ${whereClause}
       ORDER BY t.created_at DESC`,
      params
    );

    const data = rows.map((row) => {
      const canvasData = safeParseJSON<any>((row as any).canvas_data, {});
      let pages = safeParseJSON((row as any).pages, canvasData?.pages || null);
      
      // If multipage, we'll resolve background URLs during detail fetch (to avoid N+1)
      // For list view, just return as-is with note about backgrounds
      
      // Resolve template image URL: use background URL if background_id exists, otherwise use template_image_url
      const templateImageUrl = (row as any).background_id && (row as any).background_url 
        ? (row as any).background_url 
        : (row as any).template_image_url;

      return {
        ...row,
        template_image_url: templateImageUrl,
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
    const { name, description, template_image_url, canvas_data, cloudinary_public_id, thumbnail_uri, thumbnail_public_id, category_id, subcategory_id, is_multipage, pricing_type, price, color } = body;

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
      'INSERT INTO templates (name, description, template_image_url, canvas_data, pages, is_multipage, thumbnail_url, thumbnail_public_id, cloudinary_public_id, category_id, subcategory_id, pricing_type, price, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
        color || null,
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
      { success: false, error: 'Failed to Create Card' },
      { status: 500 }
    );
  }
}
