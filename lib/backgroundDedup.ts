import crypto from 'crypto';
import { pool } from './db';

interface BackgroundAsset {
  id: number;
  cloudinary_public_id: string;
  cloudinary_url: string;
  image_hash: string;
  width: number;
  height: number;
}

/**
 * Calculate SHA256 hash of image buffer
 */
export function calculateImageHash(imageBuffer: Buffer): string {
  return crypto.createHash('sha256').update(imageBuffer).digest('hex');
}

/**
 * Check if background already exists by hash
 * Returns existing asset if found, null otherwise
 */
export async function findBackgroundByHash(
  imageHash: string
): Promise<BackgroundAsset | null> {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, cloudinary_public_id, url as cloudinary_url, 
              JSON_EXTRACT(metadata, '$.image_hash') as image_hash,
              JSON_EXTRACT(metadata, '$.width') as width,
              JSON_EXTRACT(metadata, '$.height') as height
       FROM content_assets 
       WHERE asset_type = 'background' AND JSON_EXTRACT(metadata, '$.image_hash') = ?`,
      [imageHash]
    );

    if (rows.length > 0) {
      // Increment usage count
      await pool.query(
        `UPDATE content_assets 
         SET metadata = JSON_SET(metadata, '$.usage_count', COALESCE(JSON_EXTRACT(metadata, '$.usage_count'), 0) + 1)
         WHERE id = ?`,
        [rows[0].id]
      );
      return rows[0];
    }

    return null;
  } catch (error) {
    console.error('Error finding background by hash:', error);
    throw error;
  }
}

/**
 * Register a new background asset
 */
export async function registerBackground(
  cloudinaryPublicId: string,
  cloudinaryUrl: string,
  imageHash: string,
  width: number,
  height: number,
  fileSize: number
): Promise<BackgroundAsset> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Create a content_items record first
    const title = `Background ${cloudinaryPublicId}`;
    const slug = `bg-${cloudinaryPublicId}`;
    
    const [contentResult]: any = await conn.query(
      `INSERT INTO content_items (type, title, slug, is_active) VALUES ('ecard', ?, ?, TRUE)`,
      [title, slug]
    );

    const contentId = contentResult.insertId;

    // Now insert the background asset
    const [result]: any = await conn.query(
      `INSERT INTO content_assets 
       (content_id, asset_type, url, metadata)
       VALUES (?, ?, ?, JSON_OBJECT('cloudinary_public_id', ?, 'image_hash', ?, 'width', ?, 'height', ?, 'file_size', ?, 'usage_count', 1))`,
      [contentId, 'background', cloudinaryUrl, cloudinaryPublicId, imageHash, width, height, fileSize]
    );

    await conn.commit();

    return {
      id: result.insertId,
      cloudinary_public_id: cloudinaryPublicId,
      cloudinary_url: cloudinaryUrl,
      image_hash: imageHash,
      width,
      height,
    };
  } catch (error) {
    await conn.rollback();
    console.error('Error registering background:', error);
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Get or create background asset
 * If hash exists, reuses existing; otherwise creates new entry
 */
export async function getOrCreateBackground(
  cloudinaryPublicId: string,
  cloudinaryUrl: string,
  imageHash: string,
  width: number,
  height: number,
  fileSize: number
): Promise<BackgroundAsset> {
  // Check if already exists
  const existing = await findBackgroundByHash(imageHash);
  if (existing) {
    return existing;
  }

  // Register new background
  return registerBackground(
    cloudinaryPublicId,
    cloudinaryUrl,
    imageHash,
    width,
    height,
    fileSize
  );
}

/**
 * Get background by ID
 */
export async function getBackgroundById(
  backgroundId: number
): Promise<BackgroundAsset | null> {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, cloudinary_public_id, url as cloudinary_url,
              JSON_EXTRACT(metadata, '$.image_hash') as image_hash,
              JSON_EXTRACT(metadata, '$.width') as width,
              JSON_EXTRACT(metadata, '$.height') as height
       FROM content_assets 
       WHERE id = ? AND asset_type = 'background'`,
      [backgroundId]
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error fetching background:', error);
    throw error;
  }
}

/**
 * Decrement usage count and optionally delete if unused
 */
export async function releaseBackground(
  backgroundId: number,
  deleteIfUnused = false
): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      `SELECT JSON_EXTRACT(metadata, '$.usage_count') as usage_count FROM content_assets WHERE id = ? AND asset_type = 'background'`,
      [backgroundId]
    );

    if (rows.length === 0) return;

    const currentCount = rows[0].usage_count || 0;
    const newCount = currentCount - 1;

    if (deleteIfUnused && newCount <= 0) {
      // Delete unused background (also delete related content_items)
      const [contentRows]: any = await pool.query(
        `SELECT content_id FROM content_assets WHERE id = ? AND asset_type = 'background'`,
        [backgroundId]
      );
      
      if (contentRows.length > 0) {
        await pool.query('DELETE FROM content_items WHERE id = ?', [contentRows[0].content_id]);
      }
    } else if (newCount > 0) {
      // Update usage count
      await pool.query(
        `UPDATE content_assets 
         SET metadata = JSON_SET(metadata, '$.usage_count', ?)
         WHERE id = ? AND asset_type = 'background'`,
        [newCount, backgroundId]
      );
    }
  } catch (error) {
    console.error('Error releasing background:', error);
    throw error;
  }
}

/**
 * Get all unused backgrounds (for cleanup)
 */
export async function getUnusedBackgrounds(): Promise<BackgroundAsset[]> {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, cloudinary_public_id, url as cloudinary_url,
              JSON_EXTRACT(metadata, '$.image_hash') as image_hash,
              JSON_EXTRACT(metadata, '$.width') as width,
              JSON_EXTRACT(metadata, '$.height') as height
       FROM content_assets 
       WHERE asset_type = 'background' AND (JSON_EXTRACT(metadata, '$.usage_count') IS NULL OR JSON_EXTRACT(metadata, '$.usage_count') <= 0)`
    );

    return rows;
  } catch (error) {
    console.error('Error fetching unused backgrounds:', error);
    throw error;
  }
}
