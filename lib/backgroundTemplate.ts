import { pool } from './db';
import { releaseBackground } from './backgroundDedup';

/**
 * Update template to reference a background asset
 */
export async function updateTemplateBackground(
  templateId: number,
  backgroundId: number
): Promise<void> {
  try {
    // Get old background ID if exists
    const [rows]: any = await pool.query(
      'SELECT id FROM content_items WHERE id = ?',
      [templateId]
    );

    if (rows.length > 0) {
      // Update to new background via content_assets
      await pool.query(
        'UPDATE content_items SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [templateId]
      );
    }
  } catch (error) {
    console.error('Error updating template background:', error);
    throw error;
  }
}

/**
 * Add page to multipage template with background reference
 */
export async function addTemplatePage(
  templateId: number,
  backgroundId: number,
  canvasData: any
): Promise<any> {
  try {
    const [rows]: any = await pool.query(
      'SELECT canvas_schema FROM ecard_templates WHERE content_id = ?',
      [templateId]
    );

    if (rows.length === 0) {
      throw new Error('Template not found');
    }

    let canvasSchema = {};
    if (rows[0].canvas_schema) {
      canvasSchema = JSON.parse(rows[0].canvas_schema);
    }

    // Update template with canvas data
    await pool.query(
      'UPDATE ecard_templates SET canvas_schema = ? WHERE content_id = ?',
      [JSON.stringify(canvasData || canvasSchema), templateId]
    );

    return canvasData;
  } catch (error) {
    console.error('Error adding template page:', error);
    throw error;
  }
}

/**
 * Get template with resolved background URLs
 */
export async function getTemplateWithBackgrounds(
  templateId: number
): Promise<any> {
  try {
    const [rows]: any = await pool.query(
      `SELECT ci.*, et.canvas_schema, et.is_multipage, 
              ca.cloudinary_url, ca.url as thumbnail_url
       FROM content_items ci
       LEFT JOIN ecard_templates et ON et.content_id = ci.id
       LEFT JOIN content_assets ca ON ca.content_id = ci.id AND ca.asset_type = 'image'
       WHERE ci.id = ? AND ci.type = 'ecard'`,
      [templateId]
    );

    if (rows.length === 0) {
      return null;
    }

    const template = rows[0];

    // Resolve background for main canvas
    let templateImageUrl = template.thumbnail_url || template.cloudinary_url;

    return {
      ...template,
      canvas_schema: template.canvas_schema ? JSON.parse(template.canvas_schema) : {},
      template_image_url: templateImageUrl,
    };
  } catch (error) {
    console.error('Error fetching template with backgrounds:', error);
    throw error;
  }
}

/**
 * Clean up template's background references when deleting
 */
export async function cleanupTemplateBackgrounds(
  templateId: number
): Promise<void> {
  try {
    const [rows]: any = await pool.query(
      'SELECT id FROM content_items WHERE id = ? AND type = ?',
      [templateId, 'ecard']
    );

    if (rows.length === 0) return;

    // Clean up content_assets
    await pool.query(
      'DELETE FROM content_assets WHERE content_id = ?',
      [templateId]
    );
  } catch (error) {
    console.error('Error cleaning up template backgrounds:', error);
    throw error;
  }
}
