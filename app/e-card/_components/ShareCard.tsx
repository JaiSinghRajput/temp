'use client';
import { useEffect, useRef, useState } from 'react';
import { Canvas, Textbox } from 'fabric';
import { TextElement, UserEcard } from '@/lib/types';
import { loadTextOnlyCanvas, loadFontsFromElements } from '@/lib/text-only-canvas-renderer';
import { useCanvasTextAnimation } from '@/hooks/useCanvasTextAnimation';
import { useAuth } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';
import { Button } from '@mui/material';

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
  const [currentPage, setCurrentPage] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Animation hook
  const { setCanvas, animateAllTexts } = useCanvasTextAnimation();

  // Get current user
  const { user } = useAuth();
  const isOwner = user && card.user_id && user.uid === card.user_id;

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

  // Check if multipage
  const isMultipage = canvasData?.is_multipage && canvasData?.pages && canvasData.pages.length > 1;
  const totalPages = isMultipage ? canvasData.pages.length : 1;

  // Get current page data
  const currentPageData = isMultipage ? canvasData.pages[currentPage] : null;
  const currentCanvasData = currentPageData?.canvasData || canvasData;
  const textElements: TextElement[] = currentCanvasData?.textElements || [];
  const canvasWidth = currentCanvasData?.canvasWidth || 800;
  const canvasHeight = currentCanvasData?.canvasHeight || 600;

  const backgroundUrl = isMultipage
    ? (currentPageData?.imageUrl || parsedPreviewUrls[currentPage])
    : (card.template_image_url || card.preview_url || parsedPreviewUrls[0]);
  const backgroundId = isMultipage
    ? currentPageData?.backgroundId
    : (card.template_background_id != null ? Number(card.template_background_id) : undefined);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    if (!backgroundUrl && !backgroundId) {
      setError('Background not available for this card');
      return;
    }

    if (!currentCanvasData) {
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

    /* 🔥 ADD THESE LINES */
    canvas.skipTargetFind = true;
    canvas.selection = false;

    // Let browser handle touch scrolling
    canvas.upperCanvasEl.style.pointerEvents = 'none';
    canvas.lowerCanvasEl.style.pointerEvents = 'none';

    fabricCanvasRef.current = canvas;

    // Load fonts used by the card (works for both stored customFonts and CDN lookups)
    loadFontsFromElements(textElements, currentCanvasData?.customFonts)
      .catch((err) => {
        console.warn('[ShareCard] Font preload failed, continuing anyway:', err);
      })
      .finally(() => {
        loadTextOnlyCanvas({
          canvas,
          imageUrl: backgroundUrl,
          backgroundId,
          textElements,
          canvasWidth,
          canvasHeight,
          scale,
          customFonts: currentCanvasData?.customFonts,
        })
          .then(({ textObjects }) => {
            textObjects.forEach((textbox) => {
              textbox.set({ selectable: false, editable: false, evented: false, hoverCursor: 'default' });
            });
            canvas.selection = false;
            canvas.renderAll();
            textObjectsRef.current = textObjects;
            setCanvasScale(scale);

            // Set canvas for animations
            setCanvas(canvas);

            // Animate shared card with typewriter effect for a nice reveal
            const textboxArray = Array.from(textObjects.values());
            if (textboxArray.length > 0) {
              animateAllTexts(textboxArray, 'slideInTop', 1000, 150);
            }
          })
          .catch((err) => {
            console.error('Error loading shared card canvas:', err);
            setError('Unable to render shared card. Showing preview image instead.');
          });
      });

    return () => {
      canvas.dispose();
    };
  }, [backgroundUrl, backgroundId, currentCanvasData, canvasWidth, canvasHeight, currentPage]);

  // PDF download handler
  const handleDownloadPdf = async () => {
    if (!isMultipage) return;

    try {
      setIsGeneratingPdf(true);

      const pageImages: string[] = [];

      // Render each page to canvas and capture as image
      for (let i = 0; i < totalPages; i++) {
        const pageData = canvasData.pages[i];
        const pageCanvasData = pageData?.canvasData || canvasData;
        const pageBackgroundUrl = pageData?.imageUrl || parsedPreviewUrls[i];
        const pageBackgroundId = pageData?.backgroundId;
        const pageTextElements: TextElement[] = pageCanvasData?.textElements || [];
        const pageWidth = pageCanvasData?.canvasWidth || 800;
        const pageHeight = pageCanvasData?.canvasHeight || 600;

        // Create temporary canvas for this page
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = pageWidth;
        tempCanvas.height = pageHeight;

        const fabricCanvas = new Canvas(tempCanvas, {
          width: pageWidth,
          height: pageHeight,
          selection: false,
        });

        // Load and render page
        await loadTextOnlyCanvas({
          canvas: fabricCanvas,
          imageUrl: pageBackgroundUrl,
          backgroundId: pageBackgroundId,
          textElements: pageTextElements,
          canvasWidth: pageWidth,
          canvasHeight: pageHeight,
          scale: 1, // Use full resolution
          customFonts: pageCanvasData?.customFonts,
        });

        // Wait a bit for fonts to load
        await new Promise(resolve => setTimeout(resolve, 300));

        // Capture as image
        const dataUrl = fabricCanvas.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 3,
        });

        pageImages.push(dataUrl);
        fabricCanvas.dispose();
      }

      // Create PDF
      const firstPageData = canvasData.pages[0]?.canvasData || canvasData;
      const pdfWidth = firstPageData?.canvasWidth || 800;
      const pdfHeight = firstPageData?.canvasHeight || 600;

      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
        unit: 'px',
        format: [pdfWidth, pdfHeight]
      });

      // Add each page to PDF
      for (let i = 0; i < pageImages.length; i++) {
        if (i > 0) {
          pdf.addPage([pdfWidth, pdfHeight], pdfHeight > pdfWidth ? 'portrait' : 'landscape');
        }
        pdf.addImage(pageImages[i], 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      // Download PDF
      const fileName = `card-${card.id}-${Date.now()}.pdf`;
      pdf.save(fileName);

    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (error && (card.preview_url || parsedPreviewUrls.length > 0)) {
    const fallback = card.preview_url || parsedPreviewUrls[0];
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <img src={fallback} alt="Card preview" className="w-full object-contain" />
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl mt-10 flex justify-center">
      {/* Width lock to match canvas max size */}
      <div className="w-full max-w-120">

        {/* ✅ Page Buttons (Top Center Tabs) */}
        {isMultipage && (
          <div className="absolute -top-15 left-1/2 -translate-x-1/2 z-30">
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-full border border-gray-200 shadow-sm">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const isActive = idx === currentPage;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentPage(idx)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition
                    ${isActive
                        ? "bg-[#d18b47] text-white"
                        : "bg-transparent text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    page {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Canvas */}
        {error ? (
          <div className="h-96 flex items-center justify-center bg-red-50 rounded-xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative overflow-auto rounded-xl"
            style={{
              touchAction: 'pan-y',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div className="pointer-events-none">
              <canvas ref={canvasRef} />
            </div>
          </div>
        )}

        {/* 🔗 Share Actions */}
        <div className="px-4 pt-4 flex gap-2">
          <button
            onClick={() => navigator.share?.({ url: window.location.href })}
            className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-100 transition"
          >
            🔗 Share
          </button>

          <button
            onClick={() =>
              window.open(
                `https://wa.me/?text=${encodeURIComponent(window.location.href)}`,
                '_blank'
              )
            }
            className="flex-1 border border-green-500 text-green-600 rounded-lg py-2 text-sm font-medium hover:bg-green-50 transition"
          >
            🟢 WhatsApp
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
            }}
            className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-100 transition"
          >
            📋 Copy
          </button>
        </div>

        {/* ⬇️ Download Actions */}
        {isOwner && (
          <div className="border-t border-gray-200 px-4 py-4 flex gap-3">
            {!isMultipage && (
              <Button
                variant="outlined"
                className="w-full"
              >
                <a href={fabricCanvasRef.current?.toDataURL({
                  format: 'png',
                  quality: 1,
                  multiplier: 3,
                })} download={`card-${card.id}-${Date.now()}.png`}>
                  📷
                  Download Image
                </a>
              </Button>
            )}

            {isMultipage && (
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex-1 px-4 py-2 border-2 border-[#d18b47] text-[#d18b47] rounded-lg font-semibold hover:bg-[#d18b47] hover:text-white transition disabled:opacity-60"
              >
                {isGeneratingPdf ? "📄 Generating PDF..." : "📄 Download PDF"}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );

}
