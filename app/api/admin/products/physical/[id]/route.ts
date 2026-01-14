import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import slugify from "slugify";
/* =========================
   GET – SINGLE PRODUCT
========================= */

const parseJson = (value: any) => {
  if (value == null) return null;
  if (typeof value === "object") return value; // already parsed
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export async function GET(req: NextRequest) {
  try {
    // Extract product ID from URL
    const segments = req.nextUrl.pathname.split('/');
    const productId = segments[segments.length - 1];

    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID is missing" }, { status: 400 });
    }

    // Fetch product
    const [[product]] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM products WHERE id=? AND type='physical' AND is_active=1`,
      [productId]
    );

    if (!product) {
      return NextResponse.json({ success: false, error: `Product not found with id ${productId}` }, { status: 404 });
    }

    // Fetch linked categories
    const [categories] = await pool.query<RowDataPacket[]>(
      `SELECT c.id, c.name, c.slug FROM categories c
       JOIN category_links cl ON cl.category_id = c.id
       WHERE cl.target_type='product' AND cl.target_id=?`,
      [productId]
    );

    // Fetch images
    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM product_images WHERE product_id=? ORDER BY is_primary DESC, sort_order ASC`,
      [productId]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        metaData: product.metaData,
        categories,
        images,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/* =========================
   PUT – UPDATE PRODUCT
========================= */

const normalizeMeta = (val: any) => {
  if (val == null) return null;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
};

export async function PUT(req: NextRequest) {
  const conn = await pool.getConnection();

  try {
    const productId = req.nextUrl.pathname.split("/").filter(Boolean).pop();
    const id = Number(productId);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid product id" },
        { status: 400 }
      );
    }

    const { name, price, sale_price, is_active, category_ids, metaData } =
      await req.json();

    // ✅ Basic validation (otherwise you overwrite with undefined)
    if (!name || price === undefined || price === null) {
      return NextResponse.json(
        { success: false, error: "name and price are required" },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    // 1) Fetch current product
    const [existingRows] = await conn.query<RowDataPacket[]>(
      `SELECT id, name, slug FROM products WHERE id=? AND type='physical' LIMIT 1`,
      [id]
    );

    const existing = existingRows[0];
    if (!existing) {
      await conn.rollback();
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // 2) Decide slug
    let newSlug = existing.slug;

    // ✅ update slug only if name changed
    if (name.trim() !== (existing.name ?? "").trim()) {
      const baseSlug = slugify(name, { lower: true, strict: true, trim: true });
      newSlug = `${baseSlug}-${id}`;
    }

    // 3) Update product
    const [updateResult] = await conn.query<ResultSetHeader>(
      `
      UPDATE products
      SET name=?, slug=?, price=?, sale_price=?, is_active=?, metaData=?
      WHERE id=? AND type='physical'
      `,
      [
        name,
        newSlug,
        price,
        sale_price ?? null,
        is_active ?? 1,
        JSON.stringify(metaData ?? {}),
        id,
      ]
    );

    if (updateResult.affectedRows === 0) {
      await conn.rollback();
      return NextResponse.json(
        { success: false, error: "Update failed" },
        { status: 400 }
      );
    }

    // 4) Update category links
    if (Array.isArray(category_ids)) {
      await conn.query(
        `DELETE FROM category_links WHERE target_type='product' AND target_id=?`,
        [id]
      );

      if (category_ids.length) {
        const values = category_ids.map((cid: number) => [cid, "product", id]);
        await conn.query(
          `INSERT INTO category_links (category_id, target_type, target_id) VALUES ?`,
          [values]
        );
      }
    }

    await conn.commit();

    // 5) Return updated product
    const [finalRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM products WHERE id=? LIMIT 1`,
      [id]
    );

    const product = finalRows[0];

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        metaData: normalizeMeta(product?.metaData),
      },
    });
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
export async function DELETE(req: NextRequest) {
  try {
    const segments = req.nextUrl.pathname.split('/');
    const productId = segments[segments.length - 1];

    await pool.query(
      `UPDATE products SET is_active=0 WHERE id=? AND type='physical'`,
      [productId]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
