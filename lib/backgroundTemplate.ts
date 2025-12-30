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
      'SELECT background_id FROM templates WHERE id = ?',
      [templateId]
    );

    if (rows.length > 0 && rows[0].background_id) {
      // Release old background
      await releaseBackground(rows[0].background_id);
    }

    // Update to new background
    await pool.query(
      'UPDATE templates SET background_id = ? WHERE id = ?',
      [backgroundId, templateId]
    );
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
      'SELECT pages, is_multipage FROM templates WHERE id = ?',
      [templateId]
    );

    if (rows.length === 0) {
      throw new Error('Template not found');
    }

    let pages = [];
    if (rows[0].pages) {
      pages = JSON.parse(rows[0].pages);
    }

    // Add new page
    pages.push({
      backgroundId,
      canvasData,
    });

    // Update template
    await pool.query(
      'UPDATE templates SET pages = ?, is_multipage = ? WHERE id = ?',
      [JSON.stringify(pages), true, templateId]
    );

    return pages;
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
      `SELECT t.*, b.cloudinary_url as background_url
       FROM templates t
       LEFT JOIN backgrounds b ON t.background_id = b.id
       WHERE t.id = ?`,
      [templateId]
    );

    if (rows.length === 0) {
      return null;
    }

    const template = rows[0];

    // Resolve background for main canvas
    let templateImageUrl = template.template_image_url;
    if (template.background_id && template.background_url) {
      templateImageUrl = template.background_url;
    }

    // Resolve backgrounds for multipage
    let pages = [];
    if (template.pages) {
      pages = JSON.parse(template.pages);

      // Fetch background URLs for each page
      for (const page of pages) {
        if (page.backgroundId) {
          const [bgRows]: any = await pool.query(
            'SELECT cloudinary_url FROM backgrounds WHERE id = ?',
            [page.backgroundId]
          );

          if (bgRows.length > 0) {
            page.imageUrl = bgRows[0].cloudinary_url;
          }
        }
      }
    }

    return {
      ...template,
      template_image_url: templateImageUrl,
      pages,
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
      'SELECT background_id, pages FROM templates WHERE id = ?',
      [templateId]
    );

    if (rows.length === 0) return;

    // Release main background
    if (rows[0].background_id) {
      await releaseBackground(rows[0].background_id, true);
    }

    // Release page backgrounds
    if (rows[0].pages) {
      const pages = JSON.parse(rows[0].pages);
      for (const page of pages) {
        if (page.backgroundId) {
          await releaseBackground(page.backgroundId, true);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up template backgrounds:', error);
    throw error;
  }
}
