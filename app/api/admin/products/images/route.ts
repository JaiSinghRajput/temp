import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/* =========================
   GET – LIST PRODUCT IMAGES
========================= */
export async function GET(req: NextRequest) {
  try {
    const productId = req.nextUrl.searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'product_id is required' },
        { status: 400 }
      );
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT id, product_id, image_url, cloudinary_public_id,
             is_primary, sort_order, created_at
      FROM product_images
      WHERE product_id = ?
      ORDER BY is_primary DESC, sort_order ASC
      `,
      [productId]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('GET product images error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product images' },
      { status: 500 }
    );
  }
}

/* =========================
   POST – ADD PRODUCT IMAGE
========================= */
export async function POST(req: NextRequest) {
  try {
    const {
      product_id,
      image_url,
      cloudinary_public_id,
      is_primary = false,
      sort_order = 0,
    } = await req.json();

    if (!product_id || !image_url) {
      return NextResponse.json(
        { success: false, error: 'product_id and image_url are required' },
        { status: 400 }
      );
    }

    // Ensure only one primary image
    if (is_primary) {
      await pool.query(
        `UPDATE product_images SET is_primary = 0 WHERE product_id = ?`,
        [product_id]
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      `
      INSERT INTO product_images
      (product_id, image_url, cloudinary_public_id, is_primary, sort_order)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        product_id,
        image_url,
        cloudinary_public_id || null,
        is_primary ? 1 : 0,
        sort_order,
      ]
    );

    return NextResponse.json({
      success: true,
      image_id: result.insertId,
    });
  } catch (error) {
    console.error('POST product image error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add product image' },
      { status: 500 }
    );
  }
}

/* =========================
   PUT – UPDATE PRODUCT IMAGE
========================= */
export async function PUT(req: NextRequest) {
  try {
    const {
      id,
      product_id,
      image_url,
      is_primary,
      sort_order,
    } = await req.json();

    if (!id || !product_id) {
      return NextResponse.json(
        { success: false, error: 'id and product_id are required' },
        { status: 400 }
      );
    }

    // Ensure single primary image
    if (is_primary) {
      await pool.query(
        `UPDATE product_images SET is_primary = 0 WHERE product_id = ?`,
        [product_id]
      );
    }

    await pool.query(
      `
      UPDATE product_images
      SET
        image_url = COALESCE(?, image_url),
        is_primary = COALESCE(?, is_primary),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ?
      `,
      [
        image_url ?? null,
        is_primary !== undefined ? (is_primary ? 1 : 0) : null,
        sort_order ?? null,
        id,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT product image error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product image' },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE – REMOVE PRODUCT IMAGE
========================= */
export async function DELETE(req: NextRequest) {
  try {
    const imageId = req.nextUrl.searchParams.get('id');

    if (!imageId) {
      return NextResponse.json(
        { success: false, error: 'image id is required' },
        { status: 400 }
      );
    }

    // Optional: fetch public_id for cloudinary delete
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT cloudinary_public_id FROM product_images WHERE id = ?`,
      [imageId]
    );

    if (!rows.length) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    await pool.query(
      `DELETE FROM product_images WHERE id = ?`,
      [imageId]
    );

    // 🔥 Optional: delete from Cloudinary here using public_id

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE product image error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete product image' },
      { status: 500 }
    );
  }
}