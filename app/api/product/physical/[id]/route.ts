import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

/* =========================
   GET – SINGLE PRODUCT
========================= */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    const [[product]] = await pool.query<RowDataPacket[]>(
      `
      SELECT *
      FROM products
      WHERE id = ?
        AND type = 'physical'
        AND is_active = 1
      `,
      [productId]
    );

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const [categories] = await pool.query<RowDataPacket[]>(
      `
      SELECT c.*
      FROM categories c
      JOIN category_links cl ON cl.category_id = c.id
      WHERE cl.target_type='product'
        AND cl.target_id=?
      `,
      [productId]
    );

    const [images] = await pool.query<RowDataPacket[]>(
      `
      SELECT *
      FROM product_images
      WHERE product_id=?
      ORDER BY is_primary DESC, sort_order ASC
      `,
      [productId]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        categories,
        images,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/* =========================
   PUT – UPDATE PRODUCT
========================= */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const conn = await pool.getConnection();
  try {
    const productId = params.id;
    const {
      name,
      price,
      sale_price,
      is_active,
      category_ids,
      metadata,
    } = await req.json();

    await conn.beginTransaction();

    await conn.query(
      `
      UPDATE products
      SET name=?, price=?, sale_price=?, is_active=?, metadata=?
      WHERE id=? AND type='physical'
      `,
      [name, price, sale_price || null, is_active ?? 1, metadata || null, productId]
    );

    if (Array.isArray(category_ids)) {
      await conn.query(
        `DELETE FROM category_links WHERE target_type='product' AND target_id=?`,
        [productId]
      );

      if (category_ids.length) {
        const values = category_ids.map((cid: number) => [
          cid,
          'product',
          productId,
        ]);

        await conn.query(
          `
          INSERT INTO category_links
          (category_id, target_type, target_id)
          VALUES ?
          `,
          [values]
        );
      }
    }

    await conn.commit();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    await conn.rollback();
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}

/* =========================
   DELETE – SOFT DELETE
========================= */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await pool.query(
      `
      UPDATE products
      SET is_active = 0
      WHERE id = ? AND type = 'physical'
      `,
      [params.id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
