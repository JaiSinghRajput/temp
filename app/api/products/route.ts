import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

/**
 * USER SIDE PRODUCT LIST
 * - Returns only fields needed for UI
 * - Supports category + subcategory filters
 * - Returns total count
 *
 * Filters:
 * - ?category=bridal
 * - ?category=bridal&subcategory=mehendi
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;

    const category = params.get("category"); // parent slug (example: bridal)
    const subcategory = params.get("subcategory"); // child slug (example: mehendi)
    const search = params.get("q"); // optional search term

    const page = Math.max(Number(params.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(params.get("limit") || 12), 1), 50);
    const offset = (page - 1) * limit;

    // ---------------------------
    // Build WHERE + VALUES
    // ---------------------------
    let where = ` WHERE p.type='physical' AND p.is_active=1 `;
    const values: any[] = [];

    if (search) {
      where += ` AND (p.name LIKE ? OR p.slug LIKE ?) `;
      values.push(`%${search}%`, `%${search}%`);
    }

    /**
     * ✅ Category/Subcategory filter logic
     *
     * 1) category=bridal
     *    -> return all products in bridal + all its child categories
     *
     * 2) category=bridal&subcategory=mehendi
     *    -> return only products under mehendi whose parent is bridal
     */
    if (category && subcategory) {
      where += `
        AND EXISTS (
          SELECT 1
          FROM category_links cl
          JOIN categories child ON child.id = cl.category_id
          JOIN categories parent ON parent.id = child.parent_id
          WHERE cl.target_type='product'
            AND cl.target_id=p.id
            AND parent.slug=?
            AND child.slug=?
            AND parent.is_active=1
            AND child.is_active=1
        )
      `;
      values.push(category, subcategory);
    } else if (category) {
      where += `
        AND EXISTS (
          SELECT 1
          FROM category_links cl
          JOIN categories c ON c.id = cl.category_id
          LEFT JOIN categories parent ON parent.id = c.parent_id
          WHERE cl.target_type='product'
            AND cl.target_id=p.id
            AND (
              c.slug=? OR parent.slug=?
            )
            AND c.is_active=1
        )
      `;
      values.push(category, category);
    }

    // ---------------------------
    // Total count for pagination
    // ---------------------------
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM products p ${where}`,
      values
    );
    const total = countRows[0]?.total ?? 0;

    // ---------------------------
    // Actual data query
    // ---------------------------
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        p.id,
        p.name,
        p.price,
        p.sale_price,
        p.created_at,
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





// =========================Url format=========================
// /api/products
// /api/products?page=1&limit=12
// /api/products?page=2&limit=12
// /api/products?q=lehenga
// /api/products?q=lehenga&page=1&limit=12
// /api/products?category=bridal
// /api/products?category=bridal&subcategory=mehendi
// /api/products?category=groom&subcategory=wedding
// /api/products?category=bridal&subcategory=mehendi&q=red
// /api/products/12345