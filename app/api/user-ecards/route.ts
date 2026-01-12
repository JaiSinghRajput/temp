import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

const isDataUrl = (value?: string | null) =>
  !!value && value.startsWith('data:image/');

async function uploadDataUrlToCloudinary(dataUrl: string) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration missing');
  }

  const formData = new FormData();
  formData.append('file', dataUrl);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to upload preview');
  }

  const data = await res.json();
  return {
    secureUrl: data.secure_url as string,
    publicId: data.public_id as string,
    thumbnailUrl: (data.secure_url as string)?.replace('/upload/', '/upload/c_scale,w_600/'),
  };
}

// GET list of user custom content (scoped by user_id)
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

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
         ci.slug,
         ci.type
       FROM user_custom_content ucc
       LEFT JOIN content_items ci ON ucc.content_id = ci.id
       WHERE ucc.user_id = ? AND ci.type = 'ecard'
       ORDER BY ucc.created_at DESC
       LIMIT 50`,
      [userId]
    );

    const data = rows.map((row: any) => {
      const customData = typeof row.custom_data === 'string' 
        ? JSON.parse(row.custom_data) 
        : row.custom_data;

      return {
        id: row.id,
        content_id: row.content_id,
        user_id: row.user_id,
        title: row.title,
        slug: row.slug,
        public_slug: customData?.public_slug,
        type: row.type,
        customized_data: customData,
        custom_data: customData,
        preview_url: row.preview_url,
        status: row.status,
        created_at: row.created_at,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching user custom content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user custom content' },
      { status: 500 }
    );
  }
}

// POST create a new user custom content (ecard customization)
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  
  try {
    const body = await request.json();
    // Accept both template_id (from UI) and content_id (new schema)
    const content_id = body.content_id || body.template_id;
    const { user_id, custom_data, customized_data, preview_uri, preview_urls } = body;

    // Support both customized_data and custom_data field names
    const finalCustomData = customized_data || custom_data;

    if (!content_id || !finalCustomData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: template_id/content_id, customized_data' },
        { status: 400 }
      );
    }

    let uploadedPreviewUrl: string | null = null;
    let uploadedPreviewUrls: string[] = [];

    // Upload single preview (data URL) to Cloudinary if provided
    if (isDataUrl(preview_uri)) {
      try {
        const upload = await uploadDataUrlToCloudinary(preview_uri as string);
        uploadedPreviewUrl = upload.thumbnailUrl || upload.secureUrl;
      } catch (err) {
        console.error('Preview upload failed, continuing without preview:', err);
      }
    } else if (preview_uri) {
      uploadedPreviewUrl = preview_uri;
    }

    // Handle multiple preview URLs (for multipage)
    if (Array.isArray(preview_urls) && preview_urls.length > 0) {
      uploadedPreviewUrls = preview_urls;
    }

    await connection.beginTransaction();

    // Verify content item exists
    const [contentRows] = await connection.query<RowDataPacket[]>(
      'SELECT id, title, slug, type FROM content_items WHERE id = ?',
      [content_id]
    );

    if (contentRows.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, error: 'Content item (template) not found' },
        { status: 404 }
      );
    }

    const contentItem = contentRows[0] as any;

    // Get category information if available
    const [catRows] = await connection.query<RowDataPacket[]>(
      `SELECT cat.slug as category_slug, cat.name as category_name, 
              subcat.slug as subcategory_slug, subcat.name as subcategory_name
       FROM category_links cl
       LEFT JOIN categories cat ON cat.id = cl.category_id AND cat.parent_id IS NULL
       LEFT JOIN categories subcat ON subcat.id = cl.category_id AND subcat.parent_id IS NOT NULL
       WHERE cl.target_id = ? AND cl.target_type = 'content'
       LIMIT 1`,
      [content_id]
    );

    const categoryData = (catRows.length > 0 ? catRows[0] : {}) as any;

    // Generate unique public slug for this card
    const publicSlug = `card-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Add public_slug to customized data
    const dataWithSlug = {
      ...finalCustomData,
      public_slug: publicSlug,
    };

    // Create user custom content entry
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO user_custom_content (content_id, user_id, custom_data, preview_url, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        content_id,
        user_id || null,
        JSON.stringify(dataWithSlug),
        uploadedPreviewUrl || (uploadedPreviewUrls.length > 0 ? uploadedPreviewUrls[0] : null),
        'draft',
      ]
    );

    await connection.commit();

    const cardId = result.insertId;
    return NextResponse.json({
      success: true,
      data: {
        id: cardId,
        content_id,
        template_id: content_id,
        user_id: user_id || null,
        title: contentItem.title,
        slug: contentItem.slug,
        public_slug: publicSlug,
        type: contentItem.type,
        category_slug: categoryData?.category_slug || null,
        category_name: categoryData?.category_name || null,
        subcategory_slug: categoryData?.subcategory_slug || null,
        subcategory_name: categoryData?.subcategory_name || null,
        status: 'draft',
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating user custom content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user custom content' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
