import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '@/lib/db';
import {VideoInviteField } from '@/lib/types';

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const withUniqueSlug = async (title: string) => {
  const base = slugify(title) || 'video-invite';
  let candidate = base;
  let attempt = 1;

  while (true) {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM content_items WHERE slug = ? AND type = ? LIMIT 1',
      [candidate, 'video']
    );
    if (rows.length === 0) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id');
    const subcategoryId = searchParams.get('subcategory_id');
    const categorySlug = searchParams.get('category_slug');
    const subcategorySlug = searchParams.get('subcategory_slug');

    const filters: string[] = ['ci.type = ?', 'ci.is_active = TRUE'];
    const params: any[] = ['video'];

    // Filter by category
    if (categoryId) {
      filters.push('c_main.id = ?');
      params.push(Number(categoryId));
    }
    
    if (categorySlug) {
      filters.push('c_main.slug = ?');
      params.push(categorySlug);
    }

    // Filter by subcategory
    if (subcategoryId) {
      filters.push('c_sub.id = ?');
      params.push(Number(subcategoryId));
    }
    
    if (subcategorySlug) {
      filters.push('c_sub.slug = ?');
      params.push(subcategorySlug);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [templates] = await pool.query<RowDataPacket[]>(
      `SELECT 
        ci.id,
        ci.type,
        ci.title,
        ci.slug,
        ci.description,
        ci.is_active,
        ci.created_at,
        ci.updated_at,
        vt.preview_video_url,
        vt.preview_thumbnail_url,
        MAX(p.price) as price,
        GROUP_CONCAT(DISTINCT IF(c_main.id IS NOT NULL, CONCAT(c_main.id, ':', c_main.slug), NULL)) as category_data,
        GROUP_CONCAT(DISTINCT IF(c_sub.id IS NOT NULL, CONCAT(c_sub.id, ':', c_sub.slug), NULL)) as subcategory_data
       FROM content_items ci
       INNER JOIN video_templates vt ON vt.content_id = ci.id
       LEFT JOIN products p ON p.content_id = ci.id
       LEFT JOIN category_links cl_main ON cl_main.target_id = ci.id AND cl_main.target_type = 'content'
       LEFT JOIN categories c_main ON c_main.id = cl_main.category_id AND c_main.parent_id IS NULL
       LEFT JOIN category_links cl_sub ON cl_sub.target_id = ci.id AND cl_sub.target_type = 'content'
       LEFT JOIN categories c_sub ON c_sub.id = cl_sub.category_id AND c_sub.parent_id IS NOT NULL
       ${whereClause}
       GROUP BY ci.id
       ORDER BY ci.created_at DESC`,
      params
    );

    // Fetch cards for each template
    const templatesWithCards = await Promise.all(
      templates.map(async (template: any) => {
        const [cardsData] = await pool.query<RowDataPacket[]>(
          `SELECT metadata FROM content_assets WHERE content_id = ? AND asset_type = 'video_cards' LIMIT 1`,
          [template.id]
        );

        let cards = [];
        if (cardsData.length > 0) {
          const metadata = (cardsData[0] as any).metadata;
          cards = typeof metadata === 'string' ? JSON.parse(metadata) : metadata || [];
        }

        // Parse category data
        let category_slug = null;
        let category_id = null;
        let subcategory_slug = null;
        let subcategory_id = null;

        if (template.category_data) {
          const [id, slug] = template.category_data.split(',')[0].split(':');
          category_id = parseInt(id);
          category_slug = slug;
        }

        if (template.subcategory_data) {
          const [id, slug] = template.subcategory_data.split(',')[0].split(':');
          subcategory_id = parseInt(id);
          subcategory_slug = slug;
        }

        return {
          ...template,
          price: template.price ? parseFloat(template.price) : null,
          cards,
          category_slug,
          category_id,
          subcategory_slug,
          subcategory_id,
        };
      })
    );

    return NextResponse.json({ success: true, data: templatesWithCards });
  } catch (error) {
    console.error('Error fetching video templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch video templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const conn = await pool.getConnection();
  try {
    const body = await request.json();
    const {
      title,
      description,
      price,
      preview_video_url,
      preview_video_public_id,
      preview_thumbnail_url,
      category_id,
      subcategory_id,
      cards,
    } = body as {
      title?: string;
      description?: string;
      price?: number | null;
      preview_video_url?: string;
      preview_video_public_id?: string;
      preview_thumbnail_url?: string;
      category_id?: number;
      subcategory_id?: number;
      cards?: Array<{
        card_image_url?: string | null;
        card_image_public_id?: string | null;
        sort_order?: number;
        fields?: VideoInviteField[];
      }>;
    };

    if (!title || !preview_video_url) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, preview_video_url' },
        { status: 400 }
      );
    }

    const slug = await withUniqueSlug(title);

    await conn.beginTransaction();

    const [contentResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO content_items (type, title, slug, description, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      ['video', title, slug, description || null, 1]
    );

    const contentId = contentResult.insertId;

    const [templateResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO video_templates (content_id, preview_video_url, preview_thumbnail_url)
       VALUES (?, ?, ?)`,
      [
        contentId,
        preview_video_url,
        preview_thumbnail_url || null,
      ]
    );

    // Save product with price if provided
    if (price !== null && price !== undefined) {
      await conn.query<ResultSetHeader>(
        `INSERT INTO products (content_id, name, type, price, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [contentId, title, 'digital', price, 1]
      );
    }

    if (category_id) {
      await conn.query<ResultSetHeader>(
        `INSERT INTO category_links (category_id, target_type, target_id) VALUES (?, ?, ?)`,
        [category_id, 'content', contentId]
      );
    }

    if (subcategory_id) {
      await conn.query<ResultSetHeader>(
        `INSERT INTO category_links (category_id, target_type, target_id) VALUES (?, ?, ?)`,
        [subcategory_id, 'content', contentId]
      );
    }

    // Store cards data as JSON asset
    if (cards && cards.length > 0) {
      await conn.query<ResultSetHeader>(
        `INSERT INTO content_assets (content_id, asset_type, url, metadata)
         VALUES (?, ?, ?, ?)`,
        [contentId, 'video_cards', '', JSON.stringify(cards)]
      );
    }

    await conn.commit();

    return NextResponse.json({
      success: true,
      data: {
        id: contentId,
        title,
        slug,
        description: description || null,
        price: price || null,
        preview_video_url,
        preview_video_public_id: preview_video_public_id || null,
        preview_thumbnail_url: preview_thumbnail_url || null,
        category_id: category_id || null,
        subcategory_id: subcategory_id || null,
        cards: cards || [],
      },
    });
  } catch (error) {
    console.error('Error creating video template:', error);
    try {
      await conn.rollback();
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create e-video template' },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}

export async function PUT(request: NextRequest) {
  const conn = await pool.getConnection();
  try {
    const body = await request.json();
    const {
      id,
      title,
      description,
      price,
      preview_video_url,
      preview_video_public_id,
      preview_thumbnail_url,
      category_id,
      subcategory_id,
      cards,
    } = body as {
      id?: number;
      title?: string;
      description?: string | null;
      price?: number | null;
      preview_video_url?: string;
      preview_video_public_id?: string | null;
      preview_thumbnail_url?: string | null;
      category_id?: number | null;
      subcategory_id?: number | null;
      cards?: Array<{
        card_image_url?: string | null;
        card_image_public_id?: string | null;
        sort_order?: number;
        fields?: VideoInviteField[];
      }>;
    };

    if (!id || !title || !preview_video_url) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, title, preview_video_url' },
        { status: 400 }
      );
    }

    const [existingRows] = await conn.query<RowDataPacket[]>(
      'SELECT slug FROM content_items WHERE id = ? AND type = ? LIMIT 1',
      [id, 'video']
    );

    if (existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    const existingSlug = (existingRows[0] as any).slug as string;

    await conn.beginTransaction();

    await conn.query<ResultSetHeader>(
      `UPDATE content_items
         SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND type = ?` ,
      [
        title,
        description || null,
        id,
        'video'
      ]
    );

    await conn.query<ResultSetHeader>(
      `UPDATE video_templates
         SET preview_video_url = ?, preview_thumbnail_url = ?
       WHERE content_id = ?` ,
      [
        preview_video_url,
        preview_thumbnail_url || null,
        id,
      ]
    );

    // Update or insert product price
    if (price !== null && price !== undefined) {
      const [existingProduct] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM products WHERE content_id = ? LIMIT 1',
        [id]
      );

      if (existingProduct.length > 0) {
        await conn.query<ResultSetHeader>(
          'UPDATE products SET price = ? WHERE content_id = ?',
          [price, id]
        );
      } else {
        await conn.query<ResultSetHeader>(
          `INSERT INTO products (content_id, name, type, price, is_active)
           VALUES (?, ?, ?, ?, ?)`,
          [id, title, 'digital', price, 1]
        );
      }
    }

    // Update category links
    await conn.query<ResultSetHeader>(
      'DELETE FROM category_links WHERE target_id = ? AND target_type = ?',
      [id, 'content']
    );

    if (category_id) {
      await conn.query<ResultSetHeader>(
        'INSERT INTO category_links (category_id, target_type, target_id) VALUES (?, ?, ?)',
        [category_id, 'content', id]
      );
    }

    if (subcategory_id) {
      await conn.query<ResultSetHeader>(
        'INSERT INTO category_links (category_id, target_type, target_id) VALUES (?, ?, ?)',
        [subcategory_id, 'content', id]
      );
    }

    // Update cards data
    if (cards && cards.length > 0) {
      // Delete existing cards asset
      await conn.query<ResultSetHeader>(
        'DELETE FROM content_assets WHERE content_id = ? AND asset_type = ?',
        [id, 'video_cards']
      );

      // Insert updated cards asset
      await conn.query<ResultSetHeader>(
        `INSERT INTO content_assets (content_id, asset_type, url, metadata)
         VALUES (?, ?, ?, ?)`,
        [id, 'video_cards', '', JSON.stringify(cards)]
      );
    }

    await conn.commit();

    return NextResponse.json({
      success: true,
      data: {
        id,
        slug: existingSlug,
        price: price || null,
        category_id: category_id || null,
        subcategory_id: subcategory_id || null,
        cards: cards || [],
      },
    });
  } catch (error) {
    console.error('Error updating video template:', error);
    try {
      await conn.rollback();
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update video template' },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
