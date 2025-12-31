"use client";

import { useState, useRef, useEffect } from 'react';
import { Canvas } from 'fabric';
import { TextElement } from '@/lib/types';
import { loadCanvasPage, loadCustomFonts } from '@/lib/canvas-renderer';

interface MultiPageCanvasProps {
  pages: Array<{
    imageUrl?: string;
    backgroundId?: number;
    textElements: TextElement[];
    canvasWidth?: number;
    canvasHeight?: number;
  }>;
  customFonts?: Array<{ name: string; url: string }>;
  onTextChange?: (pageIndex: number, textId: string, newText: string) => void;
  onPageChange?: (pageIndex: number) => void;
  className?: string;
}

export function MultiPageCanvas({
  pages,
  customFonts,
  onTextChange,
  onPageChange,
  className = '',
}: MultiPageCanvasProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvas = useRef<Canvas | null>(null);
  const textObjects = useRef<Map<string, any>>(new Map());
  const isInitializing = useRef(false);
  const currentPageIndexRef = useRef(currentPageIndex);
  const lastLoadedPage = useRef<{ pageIndex: number; imageUrl?: string; backgroundId?: number } | null>(null);

  const currentPage = pages?.[currentPageIndex];
  const hasMultiplePages = pages?.length > 1;

  // Update ref when page changes
  useEffect(() => {
    currentPageIndexRef.current = currentPageIndex;
  }, [currentPageIndex]);

  // Clamp page index if needed
  useEffect(() => {
    if (pages?.length > 0 && currentPageIndex >= pages.length) {
      setCurrentPageIndex(Math.max(0, pages.length - 1));
    }
  }, [pages?.length, currentPageIndex]);

  // Load and render canvas
  useEffect(() => {
    if (!pages?.length || !currentPage) return;
    if (isInitializing.current) return;

    // Check if we need to reload (page changed or background changed)
    const needsReload = !lastLoadedPage.current ||
      lastLoadedPage.current.pageIndex !== currentPageIndex ||
      lastLoadedPage.current.imageUrl !== currentPage.imageUrl ||
      lastLoadedPage.current.backgroundId !== currentPage.backgroundId;

    if (!needsReload) return;

    let isMounted = true;
    isInitializing.current = true;

    const initCanvas = async () => {
      // Wait for DOM elements
      let retries = 0;
      while ((!canvasRef.current || !containerRef.current) && retries < 50) {
        await new Promise(r => setTimeout(r, 50));
        retries++;
      }

      if (!isMounted || !canvasRef.current || !containerRef.current) {
        isInitializing.current = false;
        return;
      }

      // Dispose old canvas
      if (fabricCanvas.current) {
        try {
          fabricCanvas.current.dispose();
        } catch (e) {
          console.warn('Canvas dispose error:', e);
        }
        fabricCanvas.current = null;
      }

      try {
        // Load fonts
        await loadCustomFonts(customFonts);

        if (!isMounted) {
          isInitializing.current = false;
          return;
        }

        // Create canvas
        const canvas = new Canvas(canvasRef.current, {
          backgroundColor: '#ffffff',
          selection: false,
        });
        fabricCanvas.current = canvas;

        // Calculate available space
        const { clientWidth, clientHeight } = containerRef.current;
        const padding = 48;
        const availableW = Math.max(clientWidth - padding, 240);
        const availableH = Math.max(clientHeight - padding, 240);

        // Load page content
        const result = await loadCanvasPage({
          canvas,
          imageUrl: currentPage.imageUrl,
          backgroundId: currentPage.backgroundId,
          textElements: currentPage.textElements || [],
          canvasWidth: currentPage.canvasWidth,
          canvasHeight: currentPage.canvasHeight,
          scale: 1,
          onTextSelect: (id) => isMounted && setSelectedTextId(id),
          isCancelled: () => !isMounted,
        });

        if (!isMounted) {
          isInitializing.current = false;
          return;
        }

        // Calculate responsive scale
        const scale = Math.min(
          availableW / result.designSize.width,
          availableH / result.designSize.height,
          1
        );

        // Apply scale to canvas and elements
        canvas.setDimensions({
          width: result.designSize.width * scale,
          height: result.designSize.height * scale,
        });

        result.backgroundImage.set({ scaleX: scale, scaleY: scale });

        result.textObjects.forEach((textbox) => {
          const id = (textbox as any).textId;
          const orig = result.originalTextData.get(id);
          if (orig) {
            textbox.set({
              left: orig.left * scale,
              top: orig.top * scale,
              fontSize: orig.fontSize * scale,
              width: orig.width ? orig.width * scale : undefined,
            });
            textbox.setCoords();
          }
        });

        textObjects.current = result.textObjects;
        canvas.requestRenderAll();

        // Mark this page as loaded
        lastLoadedPage.current = {
          pageIndex: currentPageIndex,
          imageUrl: currentPage.imageUrl,
          backgroundId: currentPage.backgroundId,
        };
      } catch (err) {
        console.error('Canvas load error:', err);
      } finally {
        isInitializing.current = false;
      }
    };

    initCanvas();
    return () => {
      isMounted = false;
    };
  }, [currentPageIndex]);

  // Update text on canvas when pages data changes (without re-initializing)
  useEffect(() => {
    if (!fabricCanvas.current || !currentPage?.textElements || isInitializing.current) return;

    let hasChanges = false;
    currentPage.textElements.forEach((element) => {
      const textbox = textObjects.current.get(element.id);
      if (textbox && textbox.text !== element.text) {
        textbox.set('text', element.text);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      fabricCanvas.current.requestRenderAll();
    }
  }, [currentPage?.textElements]);

  const goToPage = (index: number) => {
    if (index >= 0 && index < pages.length) {
      setCurrentPageIndex(index);
      setSelectedTextId(null);
      onPageChange?.(index);
    }
  };

  const updateText = (textId: string, newText: string) => {
    const textbox = textObjects.current.get(textId);
    if (textbox && fabricCanvas.current && !(textbox as any).isLocked) {
      textbox.set('text', newText);
      fabricCanvas.current.requestRenderAll();
      onTextChange?.(currentPageIndex, textId, newText);
    }
  };

  if (!pages?.length) {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className="flex-1 flex justify-center items-center bg-linear-to-br from-blue-50 to-purple-50">
          <p className="text-red-600 font-semibold">No pages available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 flex justify-center items-center bg-linear-to-br from-blue-50 to-purple-50 overflow-auto p-4 min-h-[40vh]"
      >
        <div className="shadow-2xl rounded-lg overflow-hidden border border-gray-200 bg-white">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Page Navigation */}
      {hasMultiplePages && (
        <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-between">
          <PageNavButton
            label="← Previous"
            onClick={() => goToPage(currentPageIndex - 1)}
            disabled={currentPageIndex === 0}
          />
          
          <PageIndicator
            current={currentPageIndex + 1}
            total={pages.length}
            onPageClick={(idx) => goToPage(idx)}
          />

          <PageNavButton
            label="Next →"
            onClick={() => goToPage(currentPageIndex + 1)}
            disabled={currentPageIndex === pages.length - 1}
          />
        </div>
      )}
    </div>
  );
}

// Reusable: Page navigation button
function PageNavButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
    >
      {label}
    </button>
  );
}

// Reusable: Page indicator with dots
function PageIndicator({
  current,
  total,
  onPageClick,
}: {
  current: number;
  total: number;
  onPageClick: (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">
        Page {current} of {total}
      </span>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => onPageClick(idx)}
            className={`w-2 h-2 rounded-full transition ${
              idx === current - 1 ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to page ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
