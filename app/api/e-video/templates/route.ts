import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '@/lib/db';
import { VideoInviteCard, VideoInviteField, VideoInviteTemplate } from '@/lib/types';

const safeParse = <T>(value: any, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch (err) {
    console.error('Failed to parse JSON field:', err);
    return fallback;
  }
};

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
      'SELECT id FROM e_video_templates WHERE slug = ? LIMIT 1',
      [candidate]
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

    if (categorySlug) {
      filters.push('vc.slug = ?');
      params.push(categorySlug);
    }

    if (subcategorySlug) {
      filters.push('vsc.slug = ?');
      params.push(subcategorySlug);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [templates] = await pool.query<RowDataPacket[]>(
      `SELECT 
        t.*, 
         vc.name AS category_name,
         vc.slug AS category_slug,
         vsc.name AS subcategory_name,
         vsc.slug AS subcategory_slug
       FROM e_video_templates t
       LEFT JOIN video_categories vc ON vc.id = t.category_id
       LEFT JOIN video_subcategories vsc ON vsc.id = t.subcategory_id
       ${whereClause}
       ORDER BY t.created_at DESC`,
      params
    );

    const [cards] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM e_video_cards ORDER BY sort_order ASC, id ASC'
    );

    const [fields] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM e_video_card_fields ORDER BY sort_order ASC, id ASC'
    );

    const fieldsByCard = new Map<number, VideoInviteField[]>();
    fields.forEach((row) => {
      const parsedOptions = safeParse<string[] | null>((row as any).options, null);
      const entry: VideoInviteField = { ...(row as any), options: parsedOptions };
      const list = fieldsByCard.get((row as any).card_id) || [];
      list.push(entry);
      fieldsByCard.set((row as any).card_id, list);
    });

    const cardsByTemplate = new Map<number, VideoInviteCard[]>();
    cards.forEach((row) => {
      const entry: VideoInviteCard = {
        ...(row as any),
        fields: fieldsByCard.get((row as any).id) || [],
      };
      const list = cardsByTemplate.get((row as any).template_id) || [];
      list.push(entry);
      cardsByTemplate.set((row as any).template_id, list);
    });

    const data: VideoInviteTemplate[] = templates.map((row) => ({
      ...(row as any),
      cards: cardsByTemplate.get((row as any).id) || [],
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching e-video templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch e-video templates' },
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
      preview_video_url,
      preview_video_public_id,
      preview_thumbnail_url,
      category_id,
      subcategory_id,
      cards,
    } = body as {
      title?: string;
      description?: string;
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

    const [templateResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO e_video_templates
        (title, slug, description, preview_video_url, preview_video_public_id, preview_thumbnail_url, category_id, subcategory_id, price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        title,
        slug,
        description || null,
        preview_video_url,
        preview_video_public_id || null,
        preview_thumbnail_url || null,
        category_id || null,
        subcategory_id || null,
        body.price ?? null,
      ]
    );

    const templateId = templateResult.insertId;

    if (Array.isArray(cards) && cards.length > 0) {
      for (const [cardIndex, card] of cards.entries()) {
        const [cardResult] = await conn.query<ResultSetHeader>(
          `INSERT INTO e_video_cards (template_id, card_image_url, card_image_public_id, sort_order)
           VALUES (?, ?, ?, ?)` ,
          [
            templateId,
            card.card_image_url || null,
            card.card_image_public_id || null,
            card.sort_order ?? cardIndex,
          ]
        );

        const cardId = cardResult.insertId;

        if (Array.isArray(card.fields) && card.fields.length > 0) {
          for (const field of card.fields) {
            await conn.query<ResultSetHeader>(
              `INSERT INTO e_video_card_fields
                (card_id, name, label, field_type, required, helper_text, options, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
              [
                cardId,
                field.name,
                field.label,
                field.field_type,
                field.required ?? true,
                field.helper_text || null,
                field.options ? JSON.stringify(field.options) : null,
                field.sort_order ?? 0,
              ]
            );
          }
        }
      }
    }

    await conn.commit();

    return NextResponse.json({
      success: true,
      data: {
        id: templateId,
        title,
        slug,
        description: description || null,
        preview_video_url,
        preview_video_public_id: preview_video_public_id || null,
        preview_thumbnail_url: preview_thumbnail_url || null,
        category_id: category_id || null,
        subcategory_id: subcategory_id || null,
        cards: cards || [],
      },
    });
  } catch (error) {
    console.error('Error creating e-video template:', error);
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
      'SELECT slug FROM e_video_templates WHERE id = ? LIMIT 1',
      [id]
    );

    if (existingRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    const existingSlug = (existingRows[0] as any).slug as string;

    await conn.beginTransaction();

    await conn.query<ResultSetHeader>(
      `UPDATE e_video_templates
         SET title = ?, description = ?, preview_video_url = ?, preview_video_public_id = ?, preview_thumbnail_url = ?, category_id = ?, subcategory_id = ?, price = ?
       WHERE id = ?` ,
      [
        title,
        description || null,
        preview_video_url,
        preview_video_public_id || null,
        preview_thumbnail_url || null,
        category_id || null,
        subcategory_id || null,
        body.price ?? null,
        id,
      ]
    );

    const [existingCards] = await conn.query<RowDataPacket[]>(
      'SELECT id FROM e_video_cards WHERE template_id = ?',
      [id]
    );

    const cardIds = existingCards.map((c) => (c as any).id);
    if (cardIds.length > 0) {
      await conn.query<ResultSetHeader>(
        'DELETE FROM e_video_card_fields WHERE card_id IN (?)',
        [cardIds]
      );
    }

    await conn.query<ResultSetHeader>(
      'DELETE FROM e_video_cards WHERE template_id = ?',
      [id]
    );

    if (Array.isArray(cards) && cards.length > 0) {
      for (const [cardIndex, card] of cards.entries()) {
        const [cardResult] = await conn.query<ResultSetHeader>(
          `INSERT INTO e_video_cards (template_id, card_image_url, card_image_public_id, sort_order)
           VALUES (?, ?, ?, ?)` ,
          [
            id,
            card.card_image_url || null,
            card.card_image_public_id || null,
            card.sort_order ?? cardIndex,
          ]
        );

        const cardId = cardResult.insertId;

        if (Array.isArray(card.fields) && card.fields.length > 0) {
          for (const field of card.fields) {
            await conn.query<ResultSetHeader>(
              `INSERT INTO e_video_card_fields
                (card_id, name, label, field_type, required, helper_text, options, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
              [
                cardId,
                field.name,
                field.label,
                field.field_type,
                field.required ?? true,
                field.helper_text || null,
                field.options ? JSON.stringify(field.options) : null,
                field.sort_order ?? 0,
              ]
            );
          }
        }
      }
    }

    await conn.commit();

    return NextResponse.json({
      success: true,
      data: {
        id,
        slug: existingSlug,
      },
    });
  } catch (error) {
    console.error('Error updating e-video template:', error);
    try {
      await conn.rollback();
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update e-video template' },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
