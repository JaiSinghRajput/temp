import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Fetch card by checking public_slug in custom_data JSON
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         ucc.id,
         ucc.content_id,
         ucc.user_id,
         ucc.custom_data,
         ucc.preview_url,
         ucc.status,
         ucc.created_at,
         ci.title,
         ci.slug AS content_slug,
         ci.type,
         cl.category_id,
         cat.slug AS category_slug,
         cat.name AS category_name,
         subcat.slug AS subcategory_slug,
         subcat.name AS subcategory_name
       FROM user_custom_content ucc
       LEFT JOIN content_items ci ON ucc.content_id = ci.id
       LEFT JOIN category_links cl ON cl.target_id = ci.id AND cl.target_type = 'content'
       LEFT JOIN categories cat ON cat.id = cl.category_id AND cat.parent_id IS NULL
       LEFT JOIN categories subcat ON subcat.id = cl.category_id AND subcat.parent_id IS NOT NULL
      WHERE JSON_UNQUOTE(JSON_EXTRACT(ucc.custom_data, '$.public_slug')) = ? AND ci.type = 'ecard'
       LIMIT 1`,
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

    const customData = parseJSON(row.custom_data);

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        content_id: row.content_id,
        user_id: row.user_id,
        title: row.title,
        public_slug: customData?.public_slug,
        content_slug: row.content_slug,
        type: row.type,
        customized_data: customData,
        custom_data: customData,
        preview_url: row.preview_url,
        status: row.status,
        category_slug: row.category_slug,
        category_name: row.category_name,
        subcategory_slug: row.subcategory_slug,
        subcategory_name: row.subcategory_name,
        created_at: row.created_at,
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
