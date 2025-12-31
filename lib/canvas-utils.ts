import { FabricImage, Canvas } from 'fabric';
interface LoadImageOptions {
  canvas: Canvas;
  imageUrl: string;
  containerWidth: number;
  containerHeight: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  /**
   * Optional cancellation hook for async image loading (helps avoid calling Fabric APIs on disposed canvases)
   */
  isCancelled?: () => boolean;
}

/**
 * Load and scale background image on canvas
 */
export async function loadCanvasBackgroundImage({
  canvas,
  imageUrl,
  containerWidth,
  containerHeight,
  onSuccess,
  onError,
  isCancelled,
}: LoadImageOptions) {
  try {
    if (!canvas || (isCancelled?.() ?? false)) return;

    const img = await FabricImage.fromURL(imageUrl, {
      crossOrigin: 'anonymous',
    });

    if (!canvas || (isCancelled?.() ?? false) || !(canvas as any).lowerCanvasEl) return;

    const imgWidth = img.width;
    const imgHeight = img.height;

    const scaleX = (containerWidth - 64) / imgWidth;
    const scaleY = (containerHeight - 64) / imgHeight;
    const scaleFactor = Math.min(scaleX, scaleY, 1);

    const finalWidth = imgWidth * scaleFactor;
    const finalHeight = imgHeight * scaleFactor;

    // Guard against calling Fabric methods after the canvas was disposed (can happen during React StrictMode double-mount)
    const hasCanvasElements = Boolean((canvas as any).lowerCanvasEl && (canvas as any).upperCanvasEl);
    if (!hasCanvasElements) return;

    canvas.setDimensions(
      {
        width: finalWidth,
        height: finalHeight,
      },
      // Avoid triggering a recalculation on a missing element during teardown
      { cssOnly: false }
    );

    canvas.backgroundImage = img;
    img.set({
      scaleX: finalWidth / imgWidth,
      scaleY: finalHeight / imgHeight,
      originX: 'left',
      originY: 'top',
      left: 0,
      top: 0,
    });

    canvas.requestRenderAll();
    onSuccess?.();
  } catch (error) {
    console.error('Failed to load image:', error);
    onError?.(error as Error);
  }
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Please upload an image file' };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'Image too large. Max 5MB allowed.' };
  }

  return { valid: true };
}
