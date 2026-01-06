import { Canvas, Textbox, FabricImage } from 'fabric';
import { TextElement } from '@/lib/types';
import { uploadService } from '@/services';

export interface TextOnlyCanvasOptions {
  canvas: Canvas;
  imageUrl?: string;
  backgroundId?: number;
  textElements: TextElement[];
  canvasWidth?: number;
  canvasHeight?: number;
  scale: number;
  onTextSelect?: (id: string) => void;
  customFonts?: Array<{ name: string; url: string }>;
}

/**
 * Resolve background URL from either direct URL or backgroundId
 */
async function resolveBackgroundUrl(
  imageUrl?: string,
  backgroundId?: number
): Promise<string> {
  if (imageUrl) {
    return imageUrl;
  }

  if (backgroundId) {
    try {
      const data = await uploadService.getBackground(String(backgroundId));
      return data.data.cloudinary_url;
    } catch (err) {
    }
  }

  throw new Error(`No imageUrl or backgroundId provided. imageUrl=${imageUrl}, backgroundId=${backgroundId}`);
}

/**
 * Load custom fonts for the canvas
 */
export async function loadCustomFonts(fonts?: Array<{ name: string; url: string }>) {
  if (!fonts || fonts.length === 0) return;

  for (const font of fonts) {
    const id = `font-${font.name.replace(/\s+/g, '-').toLowerCase()}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = font.url;
      document.head.appendChild(link);

      try {
        await document.fonts.load(`16px "${font.name}"`);
      } catch (err) {
      }
    }
  }
  await document.fonts.ready;
}

/**
 * Load canvas for text-only editing (no repositioning, no resizing, no styling changes)
 * Users can only modify the text content
 */
export async function loadTextOnlyCanvas({
  canvas,
  imageUrl,
  backgroundId,
  textElements,
  canvasWidth = 800,
  canvasHeight = 600,
  scale,
  onTextSelect,
  customFonts,
}: TextOnlyCanvasOptions): Promise<{
  backgroundImage: FabricImage;
  textObjects: Map<string, Textbox>;
}> {
  // Load custom fonts if provided
  if (customFonts) {
    await loadCustomFonts(customFonts);
  }

  // Resolve background URL
  const resolvedUrl = await resolveBackgroundUrl(imageUrl, backgroundId);

  // Load background image
  const img = await FabricImage.fromURL(resolvedUrl, { crossOrigin: 'anonymous' });

  // Calculate scale based on canvas dimensions
  const scaleX = (canvasWidth * scale) / img.width!;
  const scaleY = (canvasHeight * scale) / img.height!;
  const bgScale = Math.max(scaleX, scaleY);

  img.scaleX = bgScale;
  img.scaleY = bgScale;
  img.left = canvasWidth * scale / 2;
  img.top = canvasHeight * scale / 2;
  img.originX = 'center';
  img.originY = 'center';

  canvas.backgroundImage = img;
  canvas.renderAll();

  const textObjects = new Map<string, Textbox>();

  // Create text elements - LOCKED positions, sizes, and styles
  for (const textEl of textElements) {
    const isLocked = textEl.locked ?? false;
    
    const textbox = new Textbox(textEl.text, {
      id: textEl.id,
      label: textEl.label,
      left: textEl.left * scale,
      top: textEl.top * scale,
      fontSize: (textEl.fontSize || 40) * scale,
      fontFamily: textEl.fontFamily || 'Arial',
      fontWeight: textEl.fontWeight || 'normal',
      fill: textEl.fill || '#000000',
      textAlign: (textEl.textAlign as any) || 'left',
      angle: textEl.angle || 0,
      width: textEl.width ? textEl.width * scale : undefined,
      scaleX: textEl.scaleX || 1,
      scaleY: textEl.scaleY || 1,
      // CRITICAL: Lock all properties except text content
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      lockSkewingX: true,
      lockSkewingY: true,
      lockMovementX: true,
      lockMovementY: true,
      selectable: !isLocked,  // Locked fields cannot be selected
      editable: !isLocked,    // Locked fields cannot be edited
      hasControls: false,
      hasBorders: false,
      borderColor: 'transparent',
      cornerColor: 'transparent',
      cornerSize: 0,
    });

    // Make text editable but locked in position (only if not locked)
    if (!isLocked) {
      textbox.on('selected', () => {
        if (onTextSelect) {
          onTextSelect(textEl.id);
        }
        // Ensure text remains locked while editing
        canvas.setActiveObject(textbox);
        canvas.renderAll();
      });
    }

    canvas.add(textbox);
    textObjects.set(textEl.id, textbox);
  }

  canvas.renderAll();

  return {
    backgroundImage: img,
    textObjects,
  };
}

/**
 * Get updated text content from all text objects on canvas
 */
export function getUpdatedTextContent(textObjects: Map<string, Textbox>): Array<{
  id: string;
  text: string;
}> {
  const result: Array<{ id: string; text: string }> = [];

  textObjects.forEach((textbox, id) => {
    result.push({
      id,
      text: textbox.text || '',
    });
  });

  return result;
}
