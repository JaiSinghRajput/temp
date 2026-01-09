/**
 * REFACTORED API ROUTES FOR NEW SCHEMA
 * This file contains refactored e-video template routes for new_schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '@/lib/db';

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const withUniqueSlug = async (title: string) => {
  const base = slugify(title) || 'video-invite';
  let candidate = base;
  let attempt = 1;

  while (true) {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM content_items WHERE type = ? AND slug = ? LIMIT 1',
      ['video', candidate]
    );
    if (rows.length === 0) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
};

// GET all video templates
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get('category_slug');
    const subcategorySlug = searchParams.get('subcategory_slug');

    const filters: string[] = ['ci.type = ?', 'ci.is_active = ?'];
    const params: any[] = ['video', true];

    if (categorySlug) {
      filters.push('cat.slug = ?');
      params.push(categorySlug);
    }

    if (subcategorySlug) {
      filters.push('subcat.slug = ?');
      params.push(subcategorySlug);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ci.*, vt.preview_video_url, vt.preview_video_public_id, vt.preview_thumbnail_url,
              cat.slug AS category_slug, cat.name AS category_name,
              subcat.slug AS subcategory_slug, subcat.name AS subcategory_name
       FROM content_items ci
       LEFT JOIN video_templates vt ON vt.content_id = ci.id
       LEFT JOIN category_links cl ON cl.target_id = ci.id AND cl.target_type = 'content'
       LEFT JOIN categories cat ON cat.id = cl.category_id AND cat.parent_id IS NULL
       LEFT JOIN categories subcat ON subcat.id = cl.category_id AND subcat.parent_id IS NOT NULL
       ${whereClause}
       ORDER BY ci.created_at DESC`,
      params
    );

    const data = rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      preview_video_url: row.preview_video_url,
      preview_video_public_id: row.preview_video_public_id,
      preview_thumbnail_url: row.preview_thumbnail_url,
      category_slug: row.category_slug,
      category_name: row.category_name,
      subcategory_slug: row.subcategory_slug,
      subcategory_name: row.subcategory_name,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching video templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch video templates' },
      { status: 500 }
    );
  }
}

// POST create new video template
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const {
      title,
      description,
      preview_video_url,
      preview_video_public_id,
      preview_thumbnail_url,
      category_slug,
    } = body;

    if (!title || !preview_video_url) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, preview_video_url' },
        { status: 400 }
      );
    }

    const slug = await withUniqueSlug(title);

    await connection.beginTransaction();

    // 1. Create content item
    const [contentResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO content_items (type, title, slug, description, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      ['video', title, slug, description || null, true]
    );

    const contentId = contentResult.insertId;

    // 2. Create video template
    await connection.query(
      `INSERT INTO video_templates (content_id, preview_video_url, preview_video_public_id, preview_thumbnail_url)
       VALUES (?, ?, ?, ?)`,
      [contentId, preview_video_url, preview_video_public_id || null, preview_thumbnail_url || null]
    );

    // 3. Link to category if provided
    if (category_slug) {
      const [catRows] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM categories WHERE slug = ? AND parent_id IS NULL',
        [category_slug]
      );
      
      if (catRows.length > 0) {
        await connection.query(
          `INSERT INTO category_links (category_id, target_type, target_id)
           VALUES (?, ?, ?)`,
          [catRows[0].id, 'content', contentId]
        );
      }
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      data: {
        id: contentId,
        title,
        slug,
        description,
        preview_video_url,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating video template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create video template' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
