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
  console.log('Resolving background URL:', { imageUrl, backgroundId });
  
  if (imageUrl) {
    console.log('Using direct imageUrl:', imageUrl);
    return imageUrl;
  }

  if (backgroundId) {
    try {
      console.log('Fetching background from API:', backgroundId);
      const data = await uploadService.getBackground(String(backgroundId));
      console.log('Background resolved:', data.data.cloudinary_url);
      return data.data.cloudinary_url;
    } catch (err) {
      console.error('Error resolving background:', err);
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
        console.error(`Failed to load font ${font.name}:`, err);
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
  console.log('loadTextOnlyCanvas called with:', {
    imageUrl,
    backgroundId,
    textElementsCount: textElements?.length || 0,
    canvasWidth,
    canvasHeight,
    scale,
  });

  // Load custom fonts if provided
  if (customFonts) {
    console.log('Loading custom fonts:', customFonts);
    await loadCustomFonts(customFonts);
  }

  // Resolve background URL
  const resolvedUrl = await resolveBackgroundUrl(imageUrl, backgroundId);
  console.log('Resolved background URL:', resolvedUrl);

  // Load background image
  console.log('Loading background image from URL...');
  const img = await FabricImage.fromURL(resolvedUrl, { crossOrigin: 'anonymous' });
  console.log('Background image loaded:', { width: img.width, height: img.height });

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
  console.log('Background image set on canvas');

  const textObjects = new Map<string, Textbox>();

  // Create text elements - LOCKED positions, sizes, and styles
  console.log('Creating text elements...');
  for (const textEl of textElements) {
    const textbox = new Textbox(textEl.text, {
      id: textEl.id,
      label: textEl.label,
      left: textEl.left * scale,
      top: textEl.top * scale,
      fontSize: (textEl.fontSize || 40) * scale,
      fontFamily: textEl.fontFamily || 'Arial',
      fontWeight: textEl.fontWeight || 'normal',
      fill: textEl.fill || '#000000',
      width: (textEl.width || 200) * scale,
      textAlign: (textEl.textAlign || 'left') as any,
      angle: textEl.angle || 0,
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
      selectable: true,
      editable: true,
      hasControls: false,
      hasBorders: false,
      borderColor: 'transparent',
      cornerColor: 'transparent',
      cornerSize: 0,
    });

    // Make text editable but locked in position
    textbox.on('selected', () => {
      if (onTextSelect) {
        onTextSelect(textEl.id);
      }
      // Ensure text remains locked while editing
      canvas.setActiveObject(textbox);
      canvas.renderAll();
    });

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
