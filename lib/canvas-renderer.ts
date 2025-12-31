import { Canvas, Textbox, FabricImage } from 'fabric';
import { TextElement } from './types';

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

/**
 * Resolve background URL from either direct URL or backgroundId
 */
async function resolveBackgroundUrl(
  imageUrl?: string,
  backgroundId?: number
): Promise<string> {
  if (imageUrl) {
    console.log('Using direct imageUrl:', imageUrl);
    return imageUrl;
  }

  if (backgroundId) {
    try {
      console.log('Resolving backgroundId:', backgroundId);
      const response = await fetch(`/api/uploads/background/${backgroundId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Resolved background URL:', data.data.cloudinary_url);
        return data.data.cloudinary_url;
      } else {
        console.error('Background API error:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Error resolving background:', err);
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
        console.error(`Failed to load font ${font.name}:`, err);
      }
    }
  }
  await document.fonts.ready;
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
  originalTextData: Map<string, { left: number; top: number; fontSize: number; width?: number; angle?: number }>;
  designSize: { width: number; height: number };
}> {
  // Resolve background URL
  console.log('loadCanvasPage called with:', { imageUrl, backgroundId, textElementsCount: textElements.length });
  const resolvedUrl = await resolveBackgroundUrl(imageUrl, backgroundId);
  
  if (isCancelled?.()) {
    throw new Error('Operation cancelled');
  }
  
  console.log('Background resolved to:', resolvedUrl);
  const img = await FabricImage.fromURL(resolvedUrl, { crossOrigin: 'anonymous' });
  
  if (isCancelled?.()) {
    throw new Error('Operation cancelled');
  }
  
  console.log('Image loaded from Fabric:', { width: img.width, height: img.height });
  
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
    width: designSize.width * scale,
    height: designSize.height * scale,
  });

  canvas.backgroundImage = img;
  img.set({
    scaleX: bgFitScale * scale,
    scaleY: bgFitScale * scale,
    originX: 'left',
    originY: 'top',
    left: bgLeft * scale,
    top: bgTop * scale,
  });

  const textObjects = new Map<string, Textbox>();
  const originalTextData = new Map<string, { left: number; top: number; fontSize: number; width?: number; angle?: number }>();

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
    });

    const textbox = new Textbox(data.text, {
      left: baseLeft * scale,
      top: baseTop * scale,
      fontSize: baseFontSize * scale,
      fontFamily: data.fontFamily,
      fontWeight: data.fontWeight || 'normal',
      fill: data.fill,
      width: baseWidth ? baseWidth * scale : undefined,
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
