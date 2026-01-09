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

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === '1';
    
    // Get template with price and categories
    const [templates] = await pool.query<RowDataPacket[]>(
      `SELECT 
         ci.*,
         vt.preview_video_url,
         vt.preview_thumbnail_url,
         MAX(p.price) as price,
         GROUP_CONCAT(DISTINCT IF(c_main.id IS NOT NULL, CONCAT(c_main.id, ':', c_main.name, ':', c_main.slug), NULL)) as main_categories,
         GROUP_CONCAT(DISTINCT IF(c_sub.id IS NOT NULL, CONCAT(c_sub.id, ':', c_sub.name, ':', c_sub.slug), NULL)) as sub_categories
       FROM content_items ci
       LEFT JOIN video_templates vt ON vt.content_id = ci.id
       LEFT JOIN products p ON p.content_id = ci.id
       LEFT JOIN category_links cl ON cl.target_id = ci.id AND cl.target_type = 'content'
       LEFT JOIN categories c_main ON c_main.id = cl.category_id AND c_main.parent_id IS NULL
       LEFT JOIN categories c_sub ON c_sub.id = cl.category_id AND c_sub.parent_id IS NOT NULL
      WHERE ci.slug = ? AND ci.type = 'video' ${includeInactive ? '' : 'AND ci.is_active = TRUE'}
      GROUP BY ci.id
       LIMIT 1`,
      [slug]
    );

    if (templates.length === 0) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    const template = templates[0] as any;

    // Get cards
    const [cardsData] = await pool.query<RowDataPacket[]>(
      `SELECT metadata FROM content_assets WHERE content_id = ? AND asset_type = 'video_cards' LIMIT 1`,
      [template.id]
    );

    let cards = [];
    if (cardsData.length > 0) {
      const metadata = (cardsData[0] as any).metadata;
      cards = typeof metadata === 'string' ? JSON.parse(metadata) : metadata || [];
    }

    // Parse categories
    const parsedTemplate = {
      ...template,
      price: template.price ? parseFloat(template.price) : null,
      cards: cards,
      category_slug: null,
      subcategory_slug: null,
      category_id: null,
      subcategory_id: null,
    };

    if (template.main_categories) {
      const categories = template.main_categories.split(',').filter(Boolean);
      if (categories.length > 0) {
        const [id, name, slug] = categories[0].split(':');
        parsedTemplate.category_id = parseInt(id);
        parsedTemplate.category_name = name;
        parsedTemplate.category_slug = slug;
      }
    }

    if (template.sub_categories) {
      const categories = template.sub_categories.split(',').filter(Boolean);
      if (categories.length > 0) {
        const [id, name, slug] = categories[0].split(':');
        parsedTemplate.subcategory_id = parseInt(id);
        parsedTemplate.subcategory_name = name;
        parsedTemplate.subcategory_slug = slug;
      }
    }

    return NextResponse.json({ success: true, data: parsedTemplate });
  } catch (error) {
    console.error('Error fetching video template by slug:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch video template' },
      { status: 500 }
    );
  }
}
