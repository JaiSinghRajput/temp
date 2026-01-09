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

// GET all ecard templates
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get('category_slug');
    const subcategorySlug = searchParams.get('subcategory_slug');
    const categoryId = searchParams.get('category_id');
    const subcategoryId = searchParams.get('subcategory_id');

    const filters: string[] = ['ci.type = ?', 'ci.is_active = ?'];
    const params: any[] = ['ecard', true];

    if (categorySlug) {
      filters.push('COALESCE(parent.slug, c.slug) = ?');
      params.push(categorySlug);
    }
    if (subcategorySlug) {
      filters.push('c.parent_id IS NOT NULL AND c.slug = ?');
      params.push(subcategorySlug);
    }
    if (categoryId) {
      filters.push('COALESCE(parent.id, c.id) = ?');
      params.push(Number(categoryId));
    }
    if (subcategoryId) {
      filters.push('c.parent_id IS NOT NULL AND c.id = ?');
      params.push(Number(subcategoryId));
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
          ci.id, ci.type, ci.title, ci.slug, ci.description, ci.is_active, ci.created_at, ci.updated_at,
          et.canvas_schema, et.is_multipage,
          COALESCE(parent.id, c.id) AS category_id,
          COALESCE(parent.slug, c.slug) AS category_slug,
          COALESCE(parent.name, c.name) AS category_name,
          CASE WHEN c.parent_id IS NOT NULL THEN c.id ELSE NULL END AS subcategory_id,
          CASE WHEN c.parent_id IS NOT NULL THEN c.slug ELSE NULL END AS subcategory_slug,
          CASE WHEN c.parent_id IS NOT NULL THEN c.name ELSE NULL END AS subcategory_name,
          MAX(ca.url) AS thumbnail_url,
          p.price,
          p.sale_price
       FROM content_items ci
       INNER JOIN ecard_templates et ON et.content_id = ci.id
       LEFT JOIN category_links cl ON cl.target_id = ci.id AND cl.target_type = 'content'
       LEFT JOIN categories c ON c.id = cl.category_id
       LEFT JOIN categories parent ON parent.id = c.parent_id
       LEFT JOIN content_assets ca ON ca.content_id = ci.id 
         AND ca.asset_type = 'image' 
         AND JSON_EXTRACT(ca.metadata, '$.type') = 'thumbnail'
       LEFT JOIN products p ON p.content_id = ci.id AND p.type = 'digital'
       ${whereClause}
       GROUP BY 
         ci.id, ci.type, ci.title, ci.slug, ci.description, ci.is_active, ci.created_at, ci.updated_at, 
         et.canvas_schema, et.is_multipage,
         category_id, category_slug, category_name,
         subcategory_id, subcategory_slug, subcategory_name,
         p.id, p.price, p.sale_price
       ORDER BY ci.created_at DESC
       LIMIT 100`,
      params
    );

    const data = rows.map((row) => {
      const canvasSchema = safeParseJSON<any>((row as any).canvas_schema, {});
      const isMultipage = (row as any).is_multipage || false;
      const color = canvasSchema?.color || null;
      const colorName = canvasSchema?.colorName || null;
      
      // Extract pages from canvas_schema if multipage
      let pages = [];
      let canvasData = canvasSchema;
      
      if (isMultipage && canvasSchema.pages && Array.isArray(canvasSchema.pages)) {
        pages = canvasSchema.pages;
        canvasData = canvasSchema.pages[0]?.canvasData || canvasSchema;
      }
      
      // Determine pricing_type based on product record
      const price = (row as any).price;
      const pricing_type = price ? 'premium' : 'free';
      
      return {
        id: (row as any).id,
        title: (row as any).title,
        slug: (row as any).slug,
        description: (row as any).description,
        thumbnail_url: (row as any).thumbnail_url,
        canvas_data: canvasData,
        is_multipage: isMultipage,
        pages: isMultipage ? pages : undefined,
        is_active: (row as any).is_active,
        category_id: (row as any).category_id ? Number((row as any).category_id) : null,
        category_slug: (row as any).category_slug,
        category_name: (row as any).category_name,
        subcategory_id: (row as any).subcategory_id ? Number((row as any).subcategory_id) : null,
        subcategory_slug: (row as any).subcategory_slug,
        subcategory_name: (row as any).subcategory_name,
        created_at: (row as any).created_at,
        updated_at: (row as any).updated_at,
        color,
        color_name: colorName,
        price: price ? Number(price) : null,
        sale_price: (row as any).sale_price ? Number((row as any).sale_price) : null,
        pricing_type
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

// POST create new ecard template
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  
  try {
    const body = await request.json();
    const { title, slug, description, canvas_schema, thumbnail_url, category_slug, subcategory_slug, is_multipage, pricing_type, price } = body;

    if (!title || !slug || !canvas_schema) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, slug, canvas_schema' },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    // 1. Create content item
    const [contentResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO content_items (type, title, slug, description, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      ['ecard', title, slug, description || null, true]
    );

    const contentId = contentResult.insertId;

    console.log('Created content_items record with ID:', contentId);

    // 2. Create ecard template
    const [ecardResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO ecard_templates (content_id, canvas_schema, is_multipage)
       VALUES (?, ?, ?)`,
      [contentId, JSON.stringify(canvas_schema), is_multipage || false]
    );

    console.log('Created ecard_templates record for content_id:', contentId);

    // 3. Create thumbnail asset if provided
    if (thumbnail_url) {
      await connection.query(
        `INSERT INTO content_assets (content_id, asset_type, url, metadata)
         VALUES (?, ?, ?, ?)`,
        [contentId, 'image', thumbnail_url, JSON.stringify({ type: 'thumbnail' })]
      );
    }

    // 4. Link to category or subcategory if provided (prefer subcategory)
    if (subcategory_slug) {
      const [subRows] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM categories WHERE slug = ? AND parent_id IS NOT NULL',
        [subcategory_slug]
      );
      if (subRows.length > 0) {
        await connection.query(
          `INSERT INTO category_links (category_id, target_type, target_id)
           VALUES (?, ?, ?)`,
          [subRows[0].id, 'content', contentId]
        );
      }
    } else if (category_slug) {
      const [catRows] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM categories WHERE slug = ? AND parent_id IS NULL',
        [category_slug]
      );
      if (catRows.length > 0) {
        await connection.query(
          `INSERT INTO category_links (category_id, target_type, target_id)
           VALUES (?, ?, ?)`,
          [catRows[0].id, 'content', contentId]
        );
      }
    }

    // 5. Create product record if pricing_type is 'premium' and price is provided
    let pricing_info = null;
    if (pricing_type === 'premium' && price && Number(price) > 0) {
      const product_sku = `ecard-${slug}`;
      const product_name = title;
      const sale_price = body?.sale_price || null;

      const [productResult] = await connection.query<ResultSetHeader>(
        `INSERT INTO products (sku, name, type, price, sale_price, is_active, content_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [product_sku, product_name, 'digital', Number(price), sale_price, true, contentId]
      );

      pricing_info = {
        price: Number(price),
        sale_price: sale_price,
        pricing_type: 'premium'
      };

      console.log('Created product record with ID:', productResult.insertId);
    } else {
      pricing_info = {
        pricing_type: 'free'
      };
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      data: {
        id: contentId,
        title,
        slug,
        description,
        canvas_schema,
        is_multipage: is_multipage || false,
        is_active: true,
        created_at: new Date().toISOString(),
        ...pricing_info
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create ecard template' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
