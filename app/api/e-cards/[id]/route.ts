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

// GET single ecard template by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('=== GET /api/e-cards/[id] ===');
    console.log('Fetching template with ID:', id);

    // First check if content_item exists
    const [checkRows] = await pool.query<RowDataPacket[]>(
      'SELECT ci.id, ci.title, ci.type FROM content_items ci WHERE ci.id = ? OR ci.slug = ?',
      [isNaN(Number(id)) ? null : Number(id), id]
    );

    console.log('Content item check:', checkRows.length > 0 ? checkRows[0] : 'Not found');

    // Check if ecard_templates record exists
    const [ecardCheck] = await pool.query<RowDataPacket[]>(
      'SELECT et.content_id FROM ecard_templates et JOIN content_items ci ON et.content_id = ci.id WHERE ci.id = ? OR ci.slug = ?',
      [isNaN(Number(id)) ? null : Number(id), id]
    );

    console.log('Ecard template check:', ecardCheck.length > 0 ? ecardCheck[0] : 'Not found');

    const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT ci.id, ci.type, ci.title, ci.slug, ci.description, ci.is_active, ci.created_at, ci.updated_at,
              et.canvas_schema, et.is_multipage,
              COALESCE(parent.id, c.id) AS category_id,
              COALESCE(parent.slug, c.slug) AS category_slug,
              COALESCE(parent.name, c.name) AS category_name,
              CASE WHEN c.parent_id IS NOT NULL THEN c.id ELSE NULL END AS subcategory_id,
              CASE WHEN c.parent_id IS NOT NULL THEN c.slug ELSE NULL END AS subcategory_slug,
              CASE WHEN c.parent_id IS NOT NULL THEN c.name ELSE NULL END AS subcategory_name,
              ca_thumb.url AS thumbnail_url,
              ca_bg.url AS template_image_url,
              ca_bg.cloudinary_public_id,
              p.price,
              p.sale_price
       FROM content_items ci
       INNER JOIN ecard_templates et ON et.content_id = ci.id
       LEFT JOIN category_links cl ON cl.target_id = ci.id AND cl.target_type = 'content'
       LEFT JOIN categories c ON c.id = cl.category_id
       LEFT JOIN categories parent ON parent.id = c.parent_id
       LEFT JOIN content_assets ca_thumb ON ca_thumb.content_id = ci.id 
         AND ca_thumb.asset_type = 'image' 
         AND JSON_EXTRACT(ca_thumb.metadata, '$.type') = 'thumbnail'
       LEFT JOIN content_assets ca_bg ON ca_bg.content_id = ci.id 
         AND ca_bg.asset_type = 'image' 
         AND JSON_EXTRACT(ca_bg.metadata, '$.type') = 'background'
       LEFT JOIN products p ON p.content_id = ci.id AND p.type = 'digital'
       WHERE ci.type = ? AND (ci.id = ? OR ci.slug = ?)
       LIMIT 1`,
      ['ecard', isNaN(Number(id)) ? null : Number(id), id]
    );

    console.log('Final query result:', rows.length > 0 ? 'Found' : 'Not found');

    if (rows.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Template not found. Content item exists: ${checkRows.length > 0 ? 'yes' : 'no'}, Ecard template exists: ${ecardCheck.length > 0 ? 'yes' : 'no'}` 
        },
        { status: 404 }
      );
    }

    const row = rows[0];
    const canvasSchema = safeParseJSON<any>((row as any).canvas_schema, {});
    const isMultipage = (row as any).is_multipage || false;
    const color = canvasSchema?.color || null;
    const colorName = canvasSchema?.colorName || null;

    // Extract pages from canvas_schema if multipage, otherwise create default page structure
    let pages = [];
    let canvasData = canvasSchema;
    
    if (isMultipage && canvasSchema.pages && Array.isArray(canvasSchema.pages)) {
      pages = canvasSchema.pages;
      // Use first page's canvas data as main canvas_data
      canvasData = canvasSchema.pages[0]?.canvasData || canvasSchema;
    }

    // Determine pricing_type based on product record
    const price = (row as any).price;
    const pricing_type = price ? 'premium' : 'free';

    return NextResponse.json({
      success: true,
      data: {
        id: (row as any).id,
        title: (row as any).title,
        slug: (row as any).slug,
        description: (row as any).description,
        thumbnail_url: (row as any).thumbnail_url,
        template_image_url: (row as any).template_image_url,
        cloudinary_public_id: (row as any).cloudinary_public_id,
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
        color,
        color_name: colorName,
        created_at: (row as any).created_at,
        updated_at: (row as any).updated_at,
        price: price ? Number(price) : null,
        sale_price: (row as any).sale_price ? Number((row as any).sale_price) : null,
        pricing_type
      },
    });
  } catch (error) {
    console.error('=== ERROR in GET /api/e-cards/[id] ===');
    console.error('Error:', error);
    console.error('Error type:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: `Failed to fetch template: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// PUT update ecard template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await pool.getConnection();
  
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      slug,
      description,
      canvas_schema,
      is_active,
      category_slug,
      subcategory_slug,
      is_multipage,
      thumbnail_url,
      template_image_url,
      cloudinary_public_id,
      pricing_type,
      price,
    } = body;

    await connection.beginTransaction();

    // 1. Update content item
    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE content_items SET title = ?, slug = ?, description = ?, is_active = ?, updated_at = NOW()
       WHERE id = ? AND type = ?`,
      [title, slug, description || null, is_active !== undefined ? is_active : true, id, 'ecard']
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // 2. Update ecard template
    await connection.query(
      `UPDATE ecard_templates SET canvas_schema = ?, is_multipage = ? WHERE content_id = ?`,
      [JSON.stringify(canvas_schema), is_multipage || false, id]
    );

    // 3. Upsert thumbnail asset if provided
    if (thumbnail_url) {
      // Try update existing thumbnail
      const [thumbRows] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM content_assets 
         WHERE content_id = ? AND asset_type = 'image' AND JSON_EXTRACT(metadata, '$.type') = 'thumbnail'`,
        [id]
      );

      if (thumbRows.length > 0) {
        await connection.query(
          `UPDATE content_assets SET url = ?, metadata = JSON_OBJECT('type','thumbnail') WHERE id = ?`,
          [thumbnail_url, (thumbRows[0] as any).id]
        );
      } else {
        await connection.query(
          `INSERT INTO content_assets (content_id, asset_type, url, metadata)
           VALUES (?, 'image', ?, JSON_OBJECT('type','thumbnail'))`,
          [id, thumbnail_url]
        );
      }
    }

    // 4. Upsert background image asset if provided
    if (template_image_url) {
      const [bgRows] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM content_assets 
         WHERE content_id = ? AND asset_type = 'image' AND JSON_EXTRACT(metadata, '$.type') = 'background'`,
        [id]
      );

      if (bgRows.length > 0) {
        await connection.query(
          `UPDATE content_assets SET url = ?, cloudinary_public_id = ?, metadata = JSON_OBJECT('type','background') WHERE id = ?`,
          [template_image_url, cloudinary_public_id || null, (bgRows[0] as any).id]
        );
      } else {
        await connection.query(
          `INSERT INTO content_assets (content_id, asset_type, url, cloudinary_public_id, metadata)
           VALUES (?, 'image', ?, ?, JSON_OBJECT('type','background'))`,
          [id, template_image_url, cloudinary_public_id || null]
        );
      }
    }

    // 5. Update category link if provided (prefer subcategory)
    if (subcategory_slug || category_slug) {
      // Remove old category link
      await connection.query(
        `DELETE FROM category_links WHERE target_id = ? AND target_type = 'content'`,
        [id]
      );

      if (subcategory_slug) {
        const [subRows] = await connection.query<RowDataPacket[]>(
          'SELECT id FROM categories WHERE slug = ? AND parent_id IS NOT NULL',
          [subcategory_slug]
        );
        if (subRows.length > 0) {
          await connection.query(
            `INSERT INTO category_links (category_id, target_type, target_id)
             VALUES (?, ?, ?)`,
            [subRows[0].id, 'content', id]
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
            [catRows[0].id, 'content', id]
          );
        }
      }
    }

    // 6. Upsert product record for pricing (if pricing_type is 'premium' and price is provided)
    if (pricing_type === 'premium' && price && Number(price) > 0) {
      const product_sku = `ecard-${slug}`;
      const product_name = title;
      const sale_price = body?.sale_price || null;

      // Check if product already exists
      const [existingProducts] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM products WHERE content_id = ? AND type = 'digital'`,
        [id]
      );

      if (existingProducts.length > 0) {
        // Update existing product
        await connection.query(
          `UPDATE products SET sku = ?, name = ?, price = ?, sale_price = ? WHERE id = ?`,
          [product_sku, product_name, Number(price), sale_price, (existingProducts[0] as any).id]
        );
        console.log('Updated product record for template:', id);
      } else {
        // Create new product
        await connection.query(
          `INSERT INTO products (sku, name, type, price, sale_price, is_active, content_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [product_sku, product_name, 'digital', Number(price), sale_price, true, id]
        );
        console.log('Created product record for template:', id);
      }
    } else if (pricing_type === 'free' || !price || Number(price) === 0) {
      // Delete product if exists and pricing_type is 'free'
      await connection.query(
        `DELETE FROM products WHERE content_id = ? AND type = 'digital'`,
        [id]
      );
    }

    await connection.commit();

    return NextResponse.json({ success: true, message: 'Template updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// DELETE ecard template (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await pool.getConnection();
  
  try {
    const { id } = await params;

    await connection.beginTransaction();

    // 1. Soft delete content item
    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE content_items SET is_active = FALSE, updated_at = NOW() WHERE id = ? AND type = ?`,
      [id, 'ecard']
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // 2. Delete category links
    await connection.query(
      `DELETE FROM category_links WHERE target_id = ? AND target_type = 'content'`,
      [id]
    );

    // 3. Delete assets (optional - keep for history)
    // await connection.query(
    //   `DELETE FROM content_assets WHERE content_id = ?`,
    //   [id]
    // );

    await connection.commit();

    return NextResponse.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
