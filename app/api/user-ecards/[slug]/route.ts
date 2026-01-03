import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { slugify } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         ue.id,
         ue.template_id,
         ue.user_id,
         ue.user_name,
         ue.customized_data,
         ue.preview_url,
         ue.preview_urls,
         ue.created_at,
         cc.name AS category_name,
         cs.slug AS subcategory_slug,
         cs.name AS subcategory_name,
         t.template_image_url,
         t.background_id AS template_background_id
       FROM user_ecards ue
       LEFT JOIN templates t ON ue.template_id = t.id
       LEFT JOIN card_categories cc ON cc.id = t.category_id
       LEFT JOIN card_subcategories cs ON cs.id = t.subcategory_id
       WHERE ue.public_slug = ?`,
      [slug]
    );

    if (!rows.length) {
      return NextResponse.json(
        { success: false, error: 'Card not found' },
        { status: 404 }
      );
    }

    const row = rows[0] as any;
    const parseJSON = (val: unknown) => {
      if (!val) return null;
      if (Array.isArray(val)) return val;
      if (typeof val === 'object') return val;
      try {
        return JSON.parse(val as string);
      } catch {
        return null;
      }
    };

    const customizedData = parseJSON(row.customized_data);
    const previewUrls = parseJSON(row.preview_urls);
    const categorySlug = row.category_name ? slugify(String(row.category_name)) : null;
    const subcategorySlug = row.subcategory_slug || (row.subcategory_name ? slugify(String(row.subcategory_name)) : null);

    return NextResponse.json({
      success: true,
      data: {
        ...row,
        customized_data: customizedData || row.customized_data,
        preview_urls: previewUrls || row.preview_urls,
        category_slug: categorySlug,
        subcategory_slug: subcategorySlug,
      },
    });
  } catch (error) {
    console.error('Error fetching user ecard by slug:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user ecard' },
      { status: 500 }
    );
  }
}
