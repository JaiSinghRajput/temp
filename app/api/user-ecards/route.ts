import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { slugify } from '@/lib/utils';
import crypto from 'crypto';

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

// GET list of user ecards (scoped by user_id)
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
         ue.id,
         ue.template_id,
         ue.user_id,
         ue.user_name,
         ue.public_slug,
         ue.preview_url,
         ue.preview_urls,
         ue.created_at,
         ue.payment_status,
         ue.payment_order_id,
         ue.payment_id,
         ue.payment_signature,
         ue.payment_amount,
         COALESCE(ue.preview_url, t.thumbnail_url, t.template_image_url) AS fallback_preview,
         cc.name AS category_name,
         cs.slug AS subcategory_slug,
         cs.name AS subcategory_name,
         t.pricing_type,
         t.price
       FROM user_ecards ue
       LEFT JOIN templates t ON ue.template_id = t.id
       LEFT JOIN card_categories cc ON cc.id = t.category_id
       LEFT JOIN card_subcategories cs ON cs.id = t.subcategory_id
       WHERE ue.user_id = ?
       ORDER BY ue.created_at DESC
       LIMIT 50`,
      [userId]
    );

    const data = rows.map((row: any) => {
      const parsePreviewUrls = (value: unknown) => {
        if (!value) return null;
        if (Array.isArray(value)) return value as string[];
        try {
          const parsed = JSON.parse(value as string);
          return Array.isArray(parsed) ? parsed : null;
        } catch (err) {
          console.warn('Failed to parse preview_urls', err);
          return null;
        }
      };

      const previewUrls = parsePreviewUrls(row.preview_urls);

      const categorySlug = row.category_name ? slugify(String(row.category_name)) : null;
      const subcategorySlug = row.subcategory_slug || (row.subcategory_name ? slugify(String(row.subcategory_name)) : null);

      return {
        id: row.id,
        template_id: row.template_id,
        user_id: (row as any).user_id ?? null,
        user_name: row.user_name,
        public_slug: row.public_slug,
        preview_url: row.preview_url || previewUrls?.[0] || row.fallback_preview || null,
        preview_urls: previewUrls,
        created_at: row.created_at,
        category_slug: categorySlug,
        subcategory_slug: subcategorySlug,
        payment_status: (row as any).payment_status || null,
        payment_order_id: (row as any).payment_order_id || null,
        payment_id: (row as any).payment_id || null,
        payment_signature: (row as any).payment_signature || null,
        payment_amount: (row as any).payment_amount || null,
        pricing_type: (row as any).pricing_type,
        price: (row as any).price,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching user ecards:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user ecards' },
      { status: 500 }
    );
  }
}

// POST create a new user ecard (preview optional; supports multipage preview_urls)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template_id, user_name, user_id, customized_data, preview_uri, preview_urls } = body;

    if (!template_id || !customized_data) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let uploadedPreviewUrl: string | null = null;
    let uploadedPreviewUrls: string[] | null = null;

    // Upload single preview (data URL) to Cloudinary to avoid oversized DB values
    if (isDataUrl(preview_uri)) {
      try {
        const upload = await uploadDataUrlToCloudinary(preview_uri as string);
        uploadedPreviewUrl = upload.thumbnailUrl || upload.secureUrl;
      } catch (err) {
        console.error('Preview upload failed, continuing without preview:', err);
      }
    }

    // Upload array previews if provided
    if (Array.isArray(preview_urls) && preview_urls.length > 0) {
      const results = await Promise.all(
        preview_urls.map(async (p) => {
          if (isDataUrl(p)) {
            try {
              const upload = await uploadDataUrlToCloudinary(p as string);
              return upload.thumbnailUrl || upload.secureUrl;
            } catch (err) {
              console.error('Preview URL upload failed, skipping one entry:', err);
              return null;
            }
          }
          return p;
        })
      );

      uploadedPreviewUrls = results.filter((r): r is string => !!r);
      if (!uploadedPreviewUrl && uploadedPreviewUrls.length > 0) {
        uploadedPreviewUrl = uploadedPreviewUrls[0];
      }
    }

    // Fetch template info to build slug and return category path
    const [templates] = await pool.query<RowDataPacket[]>(
      `SELECT t.name, t.category_id, t.subcategory_id, cc.name AS category_name, cs.slug AS subcategory_slug, cs.name AS subcategory_name
       FROM templates t
       LEFT JOIN card_categories cc ON cc.id = t.category_id
       LEFT JOIN card_subcategories cs ON cs.id = t.subcategory_id
       WHERE t.id = ?
       LIMIT 1`,
      [template_id]
    );

    const templateName = (templates[0]?.name as string | undefined) || 'card';
    const base = slugify(templateName);
    const categorySlug = (templates[0] as any)?.category_name ? slugify(String((templates[0] as any)?.category_name)) : null;
    const subcategorySlug = (templates[0] as any)?.subcategory_slug || ((templates[0] as any)?.subcategory_name ? slugify(String((templates[0] as any)?.subcategory_name)) : null);

    // Generate random digits for uniqueness
    const randomDigits = (len = 8) => {
      const bytes = crypto.randomBytes(len);
      return Array.from(bytes).map(b => (b % 10).toString()).join('').slice(0, len);
    };

    let publicSlug = `${base}-${randomDigits(8)}`;
    // Ensure uniqueness (try a couple of times)
    for (let i = 0; i < 3; i++) {
      const [exists] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM user_ecards WHERE public_slug = ? LIMIT 1',
        [publicSlug]
      );
      if (!exists.length) break;
      publicSlug = `${base}-${randomDigits(10)}`;
    }

    const sanitizedPreviewUrls = uploadedPreviewUrls
      ?? (Array.isArray(preview_urls) ? preview_urls.filter((p: string) => !isDataUrl(p)) : null);

    const primaryPreview = uploadedPreviewUrl
      || (Array.isArray(sanitizedPreviewUrls) && sanitizedPreviewUrls.length > 0 ? sanitizedPreviewUrls[0] : null)
      || (!isDataUrl(preview_uri) ? preview_uri : null)
      || null;

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO user_ecards (template_id, user_id, user_name, customized_data, preview_url, preview_urls, public_slug, payment_status, payment_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        template_id,
        user_id || null,
        user_name || null,
        JSON.stringify(customized_data),
        primaryPreview,
        sanitizedPreviewUrls ? JSON.stringify(sanitizedPreviewUrls) : null,
        publicSlug,
        'pending',
        null,
      ]
    );

    return NextResponse.json({
      success: true,
      data: { id: result.insertId, slug: publicSlug, category_slug: categorySlug || null, subcategory_slug: subcategorySlug || null },
    });
  } catch (error) {
    console.error('Error creating user ecard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user ecard' },
      { status: 500 }
    );
  }
}
