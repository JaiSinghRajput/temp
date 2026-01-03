import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2';
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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
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
       WHERE t.slug = ? AND t.is_active = TRUE
       LIMIT 1`,
      [slug]
    );

    if (templates.length === 0) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    const templateRow = templates[0];

    const [cards] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM e_video_cards WHERE template_id = ? ORDER BY sort_order ASC, id ASC',
      [templateRow.id]
    );

    const [fields] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM e_video_card_fields WHERE card_id IN (?) ORDER BY sort_order ASC, id ASC',
      [cards.map((c) => (c as any).id)]
    );

    const fieldsByCard = new Map<number, VideoInviteField[]>();
    fields.forEach((row) => {
      const parsedOptions = safeParse<string[] | null>((row as any).options, null);
      const entry: VideoInviteField = { ...(row as any), options: parsedOptions };
      const list = fieldsByCard.get((row as any).card_id) || [];
      list.push(entry);
      fieldsByCard.set((row as any).card_id, list);
    });

    const cardsWithFields: VideoInviteCard[] = cards.map((row) => ({
      ...(row as any),
      fields: fieldsByCard.get((row as any).id) || [],
    }));

    const template: VideoInviteTemplate = {
      ...(templateRow as any),
      cards: cardsWithFields,
    };

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error('Error fetching e-video template by slug:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch e-video template' },
      { status: 500 }
    );
  }
}
