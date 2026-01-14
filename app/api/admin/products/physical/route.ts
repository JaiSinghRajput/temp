import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
/* =========================
   GET – LIST + FILTERS
========================= */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;

    const q = params.get("q")?.trim() || "";
    const status = params.get("status"); // all | active | inactive
    const category = params.get("category"); // optional
    const subcategories = params.get("subcategories"); // optional comma list

    const page = Math.max(Number(params.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(params.get("limit") || 12), 1), 50);
    const offset = (page - 1) * limit;

    let where = ` WHERE p.type='physical' `;
    const values: any[] = [];

    // ✅ status filter
    if (status === "active") {
      where += ` AND p.is_active=1 `;
    } else if (status === "inactive") {
      where += ` AND p.is_active=0 `;
    } // else "all" => no condition

    // ✅ q search
    if (q) {
      where += `
        AND (
          p.name LIKE ?
          OR p.sku LIKE ?
          OR p.slug LIKE ?
          OR p.product_code LIKE ?
          OR p.vendor_code LIKE ?
        )
      `;
      const like = `%${q}%`;
      values.push(like, like, like, like, like);
    }

    // ✅ category/subcategory filters (only when provided)
    if (category || subcategories) {
      // Using EXISTS prevents duplicate rows + faster than DISTINCT JOIN
      if (category && subcategories) {
        const subs = subcategories.split(",").map((s) => s.trim()).filter(Boolean);

        where += `
          AND EXISTS (
            SELECT 1
            FROM category_links cl
            JOIN categories child ON child.id = cl.category_id
            JOIN categories parent ON parent.id = child.parent_id
            WHERE cl.target_type='product'
              AND cl.target_id=p.id
              AND parent.slug=?
              AND child.slug IN (${subs.map(() => "?").join(",")})
          )
        `;
        values.push(category, ...subs);
      } else if (category) {
        where += `
          AND EXISTS (
            SELECT 1
            FROM category_links cl
            JOIN categories c ON c.id = cl.category_id
            LEFT JOIN categories parent ON parent.id = c.parent_id
            WHERE cl.target_type='product'
              AND cl.target_id=p.id
              AND (c.slug=? OR parent.slug=?)
          )
        `;
        values.push(category, category);
      } else if (subcategories) {
        const subs = subcategories.split(",").map((s) => s.trim()).filter(Boolean);
        where += `
          AND EXISTS (
            SELECT 1
            FROM category_links cl
            JOIN categories c ON c.id = cl.category_id
            WHERE cl.target_type='product'
              AND cl.target_id=p.id
              AND c.slug IN (${subs.map(() => "?").join(",")})
          )
        `;
        values.push(...subs);
      }
    }

    // ✅ total
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM products p ${where}`,
      values
    );
    const total = countRows[0]?.total ?? 0;

    // ✅ data
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        p.*,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id=p.id
          ORDER BY pi.is_primary DESC, pi.sort_order ASC
          LIMIT 1
        ) AS primary_image
      FROM products p
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return NextResponse.json({
      success: true,
      page,
      limit,
      total,
      data: rows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}


/* =========================
   POST – CREATE PRODUCT
========================= */
export async function POST(req: NextRequest) {
  const conn = await pool.getConnection();
  try {
    const {
      product_code,
      vendor_code,
      sku,
      name,
      price,
      sale_price,
      category_ids,
      metaData,
    } = await req.json();

    if (!product_code || !vendor_code || !sku || !name || !price || !Array.isArray(category_ids)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    await conn.beginTransaction();

    const [result] = await conn.query<ResultSetHeader>(
      `
      INSERT INTO products
      (product_code, vendor_code, sku, name, type, price, sale_price, metaData)
      VALUES (?, ?, ?, ?,'physical', ?, ?, ?)
      `,
      [product_code, vendor_code, sku, name, price, sale_price || null, JSON.stringify(metaData)]
    );
    const productId = result.insertId;
    if (Array.isArray(category_ids) && category_ids.length) {
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

    await conn.commit();

    return NextResponse.json({
      success: true,
      product_id: productId,
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
