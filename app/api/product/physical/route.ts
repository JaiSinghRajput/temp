import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/* =========================
   GET – LIST + FILTERS
========================= */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;

    const category = params.get('category'); // dresses | gifts
    const subcategories = params.get('subcategories'); // lehenga,saree
    const page = Number(params.get('page') || 1);
    const limit = Number(params.get('limit') || 12);
    const offset = (page - 1) * limit;

    let sql = `
      SELECT DISTINCT p.*
      FROM products p
      JOIN category_links cl ON cl.target_id = p.id
      JOIN categories c ON c.id = cl.category_id
      LEFT JOIN categories parent ON parent.id = c.parent_id
      WHERE p.type = 'physical'
        AND p.is_active = 1
    `;

    const values: any[] = [];

    if (category) {
      sql += ` AND (c.slug = ? OR parent.slug = ?) `;
      values.push(category, category);
    }

    if (subcategories) {
      const subs = subcategories.split(',').map(s => s.trim());
      sql += ` AND c.slug IN (${subs.map(() => '?').join(',')}) `;
      values.push(...subs);
    }

    sql += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ? `;
    values.push(limit, offset);

    const [rows] = await pool.query<RowDataPacket[]>(sql, values);

    return NextResponse.json({
      success: true,
      page,
      limit,
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
      name,
      price,
      sale_price,
      category_ids,
    } = await req.json();

    if (!product_code || !vendor_code || !name || !price) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await conn.beginTransaction();

    const [result] = await conn.query<ResultSetHeader>(
      `
      INSERT INTO products
      (product_code, vendor_code, name, type, price, sale_price)
      VALUES (?, ?, ?, 'physical', ?, ?)
      `,
      [product_code, vendor_code, name, price, sale_price || null]
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
