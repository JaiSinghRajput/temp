import { Canvas, Textbox, FabricImage } from 'fabric';
import { TextElement } from './types';
import { uploadService } from '@/services';
import { loadFontsFromElements } from './text-only-canvas-renderer';

export interface LoadCanvasOptions {
  canvas: Canvas;
  imageUrl?: string;
  backgroundId?: number;
  textElements: TextElement[];
  canvasWidth?: number;
  canvasHeight?: number;
  scale: number;
  onTextSelect?: (id: string) => void;
  customFonts?: Array<{ name: string; url: string }>;
  isCancelled?: () => boolean;
}

export interface RenderCanvasToImageOptions {
  canvasData?: any;
  backgroundUrl?: string;
  backgroundId?: number;
  width?: number;
  height?: number;
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
 * Render canvas data to an image (data URL)
 */
export async function renderCanvasToImage(
  options: RenderCanvasToImageOptions
): Promise<string> {
  const { canvasData, backgroundUrl, backgroundId, width = 800, height = 600, customFonts } = options;

  if (!canvasData) {
    return '';
  }

  try {
    // Load fonts first from CDN links API (with fallback to customFonts)
    if (canvasData.textElements && Array.isArray(canvasData.textElements)) {
      const textElements = canvasData.textElements as TextElement[];
      await loadFontsFromElements(textElements, customFonts).catch((err) =>
        console.warn('Font loading for preview failed:', err)
      );
    } else if (customFonts) {
      await loadCustomFonts(customFonts);
    }

    // Create a temporary canvas
    const tempCanvas = new Canvas(null as any, {
      width,
      height,
    });

    // Load background if available
    if (backgroundUrl || backgroundId) {
      const resolvedUrl = await resolveBackgroundUrl(backgroundUrl, backgroundId);
      const bgImg = await FabricImage.fromURL(resolvedUrl, { crossOrigin: 'anonymous' });

      const bgFitScale = Math.min(width / bgImg.width!, height / bgImg.height!);
      const bgWidth = bgImg.width! * bgFitScale;
      const bgHeight = bgImg.height! * bgFitScale;
      const bgLeft = (width - bgWidth) / 2;
      const bgTop = (height - bgHeight) / 2;

      tempCanvas.backgroundImage = bgImg;
      bgImg.set({
        scaleX: bgFitScale,
        scaleY: bgFitScale,
        originX: 'left',
        originY: 'top',
        left: bgLeft,
        top: bgTop,
      });
    }

    // Load text elements from canvas data - render ALL elements including locked ones
    if (canvasData.textElements && Array.isArray(canvasData.textElements)) {
      canvasData.textElements.forEach((textEl: TextElement) => {
        const textbox = new Textbox(textEl.text, {
          left: textEl.left,
          top: textEl.top,
          fontSize: textEl.fontSize,
          fontFamily: textEl.fontFamily || 'Arial',
          fontWeight: textEl.fontWeight || 'normal',
          fill: textEl.fill,
          width: textEl.width,
          textAlign: textEl.textAlign as any,
          angle: textEl.angle || 0,
          scaleX: textEl.scaleX || 1,
          scaleY: textEl.scaleY || 1,
          letterSpacing: (textEl as any).letterSpacing || 0,
          lineHeight: (textEl as any).lineHeight || 1.16,
        });
        tempCanvas.add(textbox);
      });
    }

    tempCanvas.requestRenderAll();

    // Render to image
    const multiplier = 2; // For better quality
    const imageDataUrl = tempCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier,
    });

    tempCanvas.dispose();
    return imageDataUrl;
  } catch (err) {
    console.error('Error rendering canvas to image:', err);
    return '';
  }
}

export async function loadCanvasPage({
  canvas,
  imageUrl,
  backgroundId,
  textElements,
  canvasWidth,
  canvasHeight,
  scale,
  onTextSelect,
  isCancelled,
}: LoadCanvasOptions): Promise<{
  backgroundImage: FabricImage;
  textObjects: Map<string, Textbox>;
  originalTextData: Map<string, { left: number; top: number; fontSize: number; width?: number; angle?: number; scaleX?: number; scaleY?: number }>;
  designSize: { width: number; height: number };
}> {
  // Resolve background URL
  const resolvedUrl = await resolveBackgroundUrl(imageUrl, backgroundId);
  
  if (isCancelled?.()) {
    throw new Error('Operation cancelled');
  }
  
  const img = await FabricImage.fromURL(resolvedUrl, { crossOrigin: 'anonymous' });
  
  if (isCancelled?.()) {
    throw new Error('Operation cancelled');
  }
  
  const imgWidth = img.width;
  const imgHeight = img.height;

  const baseDesignWidth = canvasWidth || imgWidth;
  const baseDesignHeight = canvasHeight || imgHeight;

  // Let the design expand to fit larger backgrounds while preserving template intent
  const designSize = {
    width: Math.max(baseDesignWidth, imgWidth),
    height: Math.max(baseDesignHeight, imgHeight),
  };

  // Scale and center the background inside the design area
  const bgFitScale = Math.min(designSize.width / imgWidth, designSize.height / imgHeight);
  const bgWidth = imgWidth * bgFitScale;
  const bgHeight = imgHeight * bgFitScale;
  const bgLeft = (designSize.width - bgWidth) / 2;
  const bgTop = (designSize.height - bgHeight) / 2;

  // Check if operation was cancelled
  if (isCancelled?.()) {
    throw new Error('Operation cancelled');
  }

  canvas.setDimensions({
    width: designSize.width,
    height: designSize.height,
  });

  canvas.backgroundImage = img;
  img.set({
    scaleX: bgFitScale,
    scaleY: bgFitScale,
    originX: 'left',
    originY: 'top',
    left: bgLeft,
    top: bgTop,
  });

  const textObjects = new Map<string, Textbox>();
  const originalTextData = new Map<string, { left: number; top: number; fontSize: number; width?: number; angle?: number; scaleX?: number; scaleY?: number }>();

  textElements.forEach((data) => {
    const baseLeft = data.left;
    const baseTop = data.top;
    const baseFontSize = data.fontSize;
    const baseWidth = data.width;
    const baseScaleX = data.scaleX ?? 1;
    const baseScaleY = data.scaleY ?? 1;

    originalTextData.set(data.id, {
      left: baseLeft,
      top: baseTop,
      fontSize: baseFontSize,
      width: baseWidth,
      angle: data.angle,
      scaleX: baseScaleX,
      scaleY: baseScaleY,
    });

    const textbox = new Textbox(data.text, {
      left: baseLeft,
      top: baseTop,
      fontSize: baseFontSize,
      fontFamily: data.fontFamily,
      fontWeight: data.fontWeight || 'normal',
      fill: data.fill,
      width: baseWidth ? baseWidth : undefined,
      textAlign: data.textAlign as any,
      angle: data.angle || 0,
      scaleX: baseScaleX,
      scaleY: baseScaleY,
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      hasControls: false,
      hasBorders: false,
      selectable: false,
      editable: false,
      hoverCursor: 'pointer',
    });

    (textbox as any).isLocked = data.locked || false;
    (textbox as any).textId = data.id;

    if (onTextSelect) {
      textbox.on('mousedown', () => {
        onTextSelect(data.id);
      });
    }

    canvas.add(textbox);
    textObjects.set(data.id, textbox);
  });

  canvas.requestRenderAll();

  return {
    backgroundImage: img,
    textObjects,
    originalTextData,
    designSize,
  };
}
