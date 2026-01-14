import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

function safeJsonParse(value: any) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const segments = req.nextUrl.pathname.split('/');
    const slug = segments[segments.length - 1];

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Slug is required" },
        { status: 400 }
      );
    }

    // ✅ fetch product by slug
    const [productRows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        p.id,
        p.slug,
        p.name,
        p.price,
        p.sale_price,
        p.metaData,
        p.created_at
      FROM products p
      WHERE p.slug=?
        AND p.type='physical'
        AND p.is_active=1
      LIMIT 1
      `,
      [slug]
    );

    const product = productRows[0];

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // ✅ images
    const [images] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        id,
        image_url,
        is_primary,
        sort_order
      FROM product_images
      WHERE product_id=?
      ORDER BY is_primary DESC, sort_order ASC
      `,
      [product.id]
    );

    // ✅ categories
    const [categories] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.parent_id,
        parent.slug AS parent_slug,
        parent.name AS parent_name
      FROM category_links cl
      JOIN categories c ON c.id = cl.category_id
      LEFT JOIN categories parent ON parent.id = c.parent_id
      WHERE cl.target_type='product'
        AND cl.target_id=?
        AND c.is_active=1
      `,
      [product.id]
    );

    // ✅ safe metaData
    const meta = safeJsonParse(product.metaData);

    const publicMeta = meta
      ? {
        sizes: meta.sizes ?? [],
        colors: meta.colors ?? [],
        material: meta.material ?? null,
        care: meta.care ?? null,
        fit: meta.fit ?? null,
      }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        sale_price: product.sale_price,
        created_at: product.created_at,
        metaData: publicMeta,
        images,
        categories,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
