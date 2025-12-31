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
      'SELECT id, cloudinary_public_id, cloudinary_url, image_hash, width, height FROM backgrounds WHERE image_hash = ?',
      [imageHash]
    );

    if (rows.length > 0) {
      // Increment usage count
      await pool.query(
        'UPDATE backgrounds SET usage_count = usage_count + 1 WHERE id = ?',
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
  try {
    const [result]: any = await pool.query(
      `INSERT INTO backgrounds 
       (cloudinary_public_id, cloudinary_url, image_hash, width, height, file_size, usage_count)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [cloudinaryPublicId, cloudinaryUrl, imageHash, width, height, fileSize]
    );

    return {
      id: result.insertId,
      cloudinary_public_id: cloudinaryPublicId,
      cloudinary_url: cloudinaryUrl,
      image_hash: imageHash,
      width,
      height,
    };
  } catch (error) {
    console.error('Error registering background:', error);
    throw error;
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
      'SELECT id, cloudinary_public_id, cloudinary_url, image_hash, width, height FROM backgrounds WHERE id = ?',
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
      'SELECT usage_count FROM backgrounds WHERE id = ?',
      [backgroundId]
    );

    if (rows.length === 0) return;

    const newCount = rows[0].usage_count - 1;

    if (deleteIfUnused && newCount <= 0) {
      // Delete unused background
      await pool.query('DELETE FROM backgrounds WHERE id = ?', [backgroundId]);
    } else if (newCount > 0) {
      // Update usage count
      await pool.query(
        'UPDATE backgrounds SET usage_count = ? WHERE id = ?',
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
      'SELECT id, cloudinary_public_id, cloudinary_url, image_hash, width, height FROM backgrounds WHERE usage_count <= 0'
    );

    return rows;
  } catch (error) {
    console.error('Error fetching unused backgrounds:', error);
    throw error;
  }
}
