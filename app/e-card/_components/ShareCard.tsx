'use client';
import { useEffect, useRef, useState } from 'react';
import { Canvas, Textbox } from 'fabric';
import { TextElement, UserEcard } from '@/lib/types';
import { loadTextOnlyCanvas } from '@/lib/text-only-canvas-renderer';
import { useCanvasTextAnimation } from '@/hooks/useCanvasTextAnimation';
import { useAuth } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';

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
          multiplier: 1,
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
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      {error ? (
        <div className="h-96 flex items-center justify-center bg-red-50 border border-red-200">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      ) : (
        <div className="relative">
          {/* Page Navigation for Multipage */}
          {isMultipage && (
            <>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-700">
                  Page {currentPage + 1} of {totalPages}
                </span>
              </div>
              
              <button
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition z-10"
                aria-label="Previous page"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition z-10"
                aria-label="Next page"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Page Dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx)}
                    className={`w-2 h-2 rounded-full transition ${
                      idx === currentPage ? 'bg-[#d18b47] w-6' : 'bg-white/70 hover:bg-white'
                    }`}
                    aria-label={`Go to page ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
          
          <div ref={containerRef} className="flex items-center justify-center bg-gray-50 p-6 min-h-100">
            <canvas
              ref={canvasRef}
              className="border-2 border-gray-300 rounded-lg shadow-sm"
            />
          </div>
        </div>
      )}
      
      {/* Download Buttons - Only visible to card owner */}
      {isOwner && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => {
              const preview = card.preview_url || parsedPreviewUrls[0];
              if (preview) window.open(preview, '_blank', 'noopener');
            }}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg font-semibold hover:bg-gray-200 transition"
          >
            Download Image
          </button>
          {isMultipage && (
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex-1 px-4 py-2 border-2 border-[#d18b47] text-[#d18b47] rounded-lg font-semibold hover:bg-[#d18b47] hover:text-white transition disabled:opacity-60"
            >
              {isGeneratingPdf ? '📄 Generating PDF...' : '📄 Download PDF'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
