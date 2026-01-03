'use client';
import { useEffect, useRef, useState } from 'react';
import { Canvas, Textbox } from 'fabric';
import { TextElement, UserEcard } from '@/lib/types';
import { loadTextOnlyCanvas } from '@/lib/text-only-canvas-renderer';

interface ShareCardProps {
  card: UserEcard & {
    template_image_url?: string | null;
    template_background_id?: number | null;
  };
}

export default function ShareCard({ card }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const textObjectsRef = useRef<Map<string, Textbox>>(new Map());

  const [canvasScale, setCanvasScale] = useState(0.5);
  const [error, setError] = useState('');

  const canvasData = typeof card.customized_data === 'string'
    ? (() => {
        try { return JSON.parse(card.customized_data); } catch { return null; }
      })()
    : card.customized_data;

  const parsedPreviewUrls = Array.isArray(card.preview_urls)
    ? card.preview_urls
    : (() => {
        try {
          const parsed = typeof card.preview_urls === 'string' ? JSON.parse(card.preview_urls) : null;
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

  const textElements: TextElement[] = canvasData?.textElements || [];
  const canvasWidth = canvasData?.canvasWidth || 800;
  const canvasHeight = canvasData?.canvasHeight || 600;

  const backgroundUrl = card.template_image_url || card.preview_url || parsedPreviewUrls[0];
  const backgroundId = card.template_background_id != null ? Number(card.template_background_id) : undefined;

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    if (!backgroundUrl && !backgroundId) {
      setError('Background not available for this card');
      return;
    }

    if (!canvasData) {
      setError('Card content missing');
      return;
    }

    const container = containerRef.current;
    const width = Math.min(container.offsetWidth, 480);
    const height = (width / canvasWidth) * canvasHeight;
    const scale = width / canvasWidth;

    canvasRef.current.width = width;
    canvasRef.current.height = height;

    const canvas = new Canvas(canvasRef.current, {
      width,
      height,
      selection: false,
      interactive: false,
    });

    fabricCanvasRef.current = canvas;

    loadTextOnlyCanvas({
      canvas,
      imageUrl: backgroundUrl,
      backgroundId,
      textElements,
      canvasWidth,
      canvasHeight,
      scale,
      customFonts: canvasData?.customFonts,
    })
      .then(({ textObjects }) => {
        textObjects.forEach((textbox) => {
          textbox.set({ selectable: false, editable: false, evented: false, hoverCursor: 'default' });
        });
        canvas.selection = false;
        canvas.renderAll();
        textObjectsRef.current = textObjects;
        setCanvasScale(scale);
      })
      .catch((err) => {
        console.error('Error loading shared card canvas:', err);
        setError('Unable to render shared card. Showing preview image instead.');
      });

    return () => {
      canvas.dispose();
    };
  }, [backgroundUrl, backgroundId, canvasData, canvasWidth, canvasHeight]);

  if (error && (card.preview_url || parsedPreviewUrls.length > 0)) {
    const fallback = card.preview_url || parsedPreviewUrls[0];
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <img src={fallback} alt="Card preview" className="w-full object-contain" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      {error ? (
        <div className="h-96 flex items-center justify-center bg-red-50 border border-red-200">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      ) : (
        <div ref={containerRef} className="flex items-center justify-center bg-gray-50 p-6 min-h-100">
          <canvas
            ref={canvasRef}
            className="border-2 border-gray-300 rounded-lg shadow-sm"
          />
        </div>
      )}
    </div>
  );
}
