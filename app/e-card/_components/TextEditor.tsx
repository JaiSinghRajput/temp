'use client';
import { useEffect, useRef, useState } from 'react';
import { Canvas, Textbox } from 'fabric';
import { TextElement, Template } from '@/lib/types';
import {
  loadTextOnlyCanvas,
  getUpdatedTextContent,
  loadCustomFonts,
  loadFontsFromElements,
} from '@/lib/text-only-canvas-renderer';
import { useCanvasTextAnimation } from '@/hooks/useCanvasTextAnimation';
import jsPDF from 'jspdf';

interface PublishPayload {
  customizedData: any;
  previewDataUrl?: string;
  previewUrls?: string[];
}

interface TextEditorProps {
  templateId: number;
  template: Template;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPublish?: (payload: PublishPayload) => void;
  isLoading?: boolean;
}

export default function TextEditor({
  templateId,
  template,
  currentPage = 0,
  onPageChange,
  onPublish,
  isLoading = false,
}: TextEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const textObjectsRef = useRef<Map<string, Textbox>>(new Map());
  const lastSavedPageRef = useRef<number>(-1);
  const initializedTemplateIdRef = useRef<number | null>(null);

  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [canvasScale, setCanvasScale] = useState(0.5);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileEditor, setShowMobileEditor] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Store customizations for each page in multipage templates
  const [pageCustomizations, setPageCustomizations] = useState<Map<number, { canvasData: any; previewDataUrl: string }>>(new Map());

  // Animation hook
  const { setCanvas, animateAllTexts } = useCanvasTextAnimation();

  // Get multipage info
  const isMultipage = template.is_multipage && template.pages && template.pages.length > 1;
  const totalPages = isMultipage ? template.pages!.length : 1;

  // Get current page data
  const currentPageData = isMultipage ? template.pages![currentPage] : null;
  // Check if there are saved customizations for this page, otherwise use template data
  const pageCustomization = isMultipage ? pageCustomizations.get(currentPage) : undefined;
  const canvasData = pageCustomization?.canvasData || currentPageData?.canvasData || template.canvas_data;
  
  if (isMultipage && canvasData) {
    console.log(`[TextEditor] Page ${currentPage} using:`, {
      hasPageCustomization: !!pageCustomization,
      textElementsCount: canvasData.textElements?.length,
      firstTextElement: canvasData.textElements?.[0]?.text
    });
  }
  const backgroundUrl = currentPageData?.imageUrl || template.template_image_url;
  const backgroundId = currentPageData?.backgroundId || template.background_id;

  // Get text elements from canvas data
  const textElements: TextElement[] = canvasData?.textElements || [];
  const canvasWidth = canvasData?.canvasWidth || 800;
  const canvasHeight = canvasData?.canvasHeight || 600;

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) {
      return;
    }

    if (!backgroundUrl && !backgroundId) {
      setError('Template missing background image');
      return;
    }

    const container = containerRef.current;
    const width = Math.min(container.offsetWidth, 420);
    const height = (width / canvasWidth) * canvasHeight;
    const scale = width / canvasWidth;

    canvasRef.current.width = width;
    canvasRef.current.height = height;

    const canvas = new Canvas(canvasRef.current, {
      width,
      height,
      selection: false,
    });

    fabricCanvasRef.current = canvas;

    // Load fonts from text elements (with fallback to CDN links API)
    loadFontsFromElements(textElements, canvasData?.customFonts).catch((err) => {
      console.warn('Font loading failed, continuing anyway:', err);
    });

    // Load canvas with text elements
    loadTextOnlyCanvas({
      canvas,
      imageUrl: backgroundUrl,
      backgroundId,
      textElements,
      canvasWidth,
      canvasHeight,
      scale,
      onTextSelect: (id) => {
        setSelectedTextId(id);
        const textbox = textObjectsRef.current.get(id);
        if (textbox) {
          setSelectedText(textbox.text || '');
        }
        if (isMobile) {
          setShowMobileEditor(true);
        }
      },
      customFonts: canvasData?.customFonts,
    })
      .then(({ textObjects }) => {
        textObjectsRef.current = textObjects;
        setCanvasScale(scale);

        // Set canvas for animations
        setCanvas(canvas);

        // Animate all text elements on load with fadeIn effect
        const textboxArray = Array.from(textObjects.values());
        if (textboxArray.length > 0) {
          animateAllTexts(textboxArray, 'fadeIn', 800, 100);
        }
      })
      .catch((err) => {
        console.error('Error loading canvas:', err);
        setError(`Failed to load canvas: ${err.message}`);
      });

    return () => {
      canvas.dispose();
    };
  }, [canvasData, backgroundUrl, backgroundId, canvasWidth, canvasHeight, isMobile, currentPage]);

  // Initialize pageCustomizations from template when it loads (e.g., after restoring from draft)
  useEffect(() => {
    if (!isMultipage || !template.pages) return;

    // Only initialize once per template to avoid resetting during edits
    if (initializedTemplateIdRef.current === templateId) return;

    console.log('[TextEditor] Initializing pageCustomizations for template', templateId, 'pages:', template.pages.length);

    // Initialize pageCustomizations with all pages' canvasData from the template
    // This ensures that customizations restored from draft are preserved
    const initializations = new Map<number, { canvasData: any; previewDataUrl: string }>();

    template.pages.forEach((page, idx) => {
      // Store each page's canvasData - use page-specific or fall back to template canvas_data
      const pageCanvasData = page.canvasData || template.canvas_data;
      if (pageCanvasData) {
        console.log(`[TextEditor] Page ${idx} canvasData:`, pageCanvasData.textElements?.length, 'text elements');
        initializations.set(idx, {
          canvasData: pageCanvasData,
          previewDataUrl: '',
        });
      }
    });

    // Update state with all pages' customizations
    if (initializations.size > 0) {
      console.log('[TextEditor] Setting pageCustomizations with', initializations.size, 'pages');
      setPageCustomizations(initializations);
    }

    // Reset page tracking and text objects when template loads
    lastSavedPageRef.current = 0;
    textObjectsRef.current.clear();

    // Mark this template as initialized
    initializedTemplateIdRef.current = templateId;
  }, [template, isMultipage, templateId]);

  // Track viewport for mobile handling
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    handler(mq);
    mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  }, []);

  // Save current page customizations when switching pages in multipage templates
  useEffect(() => {
    if (!isMultipage) return;

    // If we switched to a different page, save the previous page first
    if (lastSavedPageRef.current !== -1 && lastSavedPageRef.current !== currentPage) {
      console.log(`[TextEditor] Switching from page ${lastSavedPageRef.current} to page ${currentPage}`);
      const canvas = fabricCanvasRef.current;
      if (canvas && textObjectsRef.current.size > 0) {
        try {
          // Get the OLD page's data from pageCustomizations or template
          const previousPageData = template.pages![lastSavedPageRef.current];
          const previousCanvasData = pageCustomizations.get(lastSavedPageRef.current)?.canvasData || previousPageData.canvasData;
          const previousTextElements = previousCanvasData?.textElements || [];

          // Get updated text from the current canvas (which still has old page's text)
          const updatedTexts = getUpdatedTextContent(textObjectsRef.current);
          
          // Check if anything actually changed before saving
          const hasChanges = updatedTexts.some(
            (ut) => {
              const originalText = previousTextElements.find((el: any) => el.id === ut.id)?.text;
              return originalText !== ut.text;
            }
          );

          console.log(`[TextEditor] Page ${lastSavedPageRef.current} hasChanges:`, hasChanges, 'updatedTexts:', updatedTexts.length);

          if (hasChanges) {
            const customizedData = {
              ...previousCanvasData,
              textElements: previousTextElements.map((el: any) => ({
                ...el,
                text: updatedTexts.find((ut) => ut.id === el.id)?.text || el.text,
              })),
            };

            setPageCustomizations((prev) => {
              const updated = new Map(prev);
              updated.set(lastSavedPageRef.current, { 
                canvasData: customizedData, 
                previewDataUrl: '' 
              });
              console.log(`[TextEditor] Saved page ${lastSavedPageRef.current} customization`);
              return updated;
            });
          }
        } catch (err) {
          console.warn('Failed to save previous page customization:', err);
        }
      }
    }

    // Clear selection state when switching pages
    setSelectedTextId(null);
    setSelectedText('');

    // Update the tracked page
    lastSavedPageRef.current = currentPage;
  }, [currentPage, isMultipage, pageCustomizations, template.pages]);

  // Update text when editing
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setSelectedText(newText);

    if (selectedTextId && fabricCanvasRef.current) {
      const textbox = textObjectsRef.current.get(selectedTextId);
      if (textbox) {
        textbox.set({ text: newText });
        fabricCanvasRef.current.renderAll();
      }
    }
  };

  // Handle publish
  const handlePublish = async () => {
    if (!fabricCanvasRef.current) return;

    try {
      setIsSaving(true);
      setError('');

      // Get updated text content for current page
      const updatedTexts = getUpdatedTextContent(textObjectsRef.current);

      // Create customized data for current page
      const currentCustomizedData = {
        ...canvasData,
        textElements: textElements.map((el) => ({
          ...el,
          text: updatedTexts.find((ut) => ut.id === el.id)?.text || el.text,
        })),
      };

      // Export preview for current page
      const multiplier = Math.max(2, 1 / canvasScale || 1);
      const previewDataUrl = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier,
      });

      // For multipage, collect all page customizations
      let finalCustomizedData;
      let finalPreviewUrls: string[] | undefined;

      if (isMultipage) {
        // Save current page customization
        const allCustomizations = new Map(pageCustomizations);
        allCustomizations.set(currentPage, {
          canvasData: currentCustomizedData,
          previewDataUrl,
        });

        // Build complete multipage data structure
        const pages = template.pages!.map((page, idx) => {
          const customization = allCustomizations.get(idx);
          return {
            ...page,
            canvasData: customization?.canvasData || page.canvasData,
          };
        });

        finalCustomizedData = {
          ...template.canvas_data,
          is_multipage: true,
          pages,
        };

        // Collect all preview URLs - only include those that were actually edited
        // Other pages will be generated on preview page from canvas data
        finalPreviewUrls = template.pages!.map((_, idx) => {
          const customization = allCustomizations.get(idx);
          return customization?.previewDataUrl || '';
        });
      } else {
        // Single page
        finalCustomizedData = currentCustomizedData;
      }

      if (onPublish) {
        await onPublish({
          customizedData: finalCustomizedData,
          previewDataUrl: isMultipage ? finalPreviewUrls?.[0] : previewDataUrl,
          previewUrls: isMultipage ? finalPreviewUrls : undefined,
        });
      }
    } catch (err) {
      console.error('Error publishing card:', err);
      setError('Failed to publish card');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate PDF from multipage card
  const handleDownloadPdf = async () => {
    if (!isMultipage) return;

    try {
      setIsGeneratingPdf(true);
      setError('');

      // Save current page first
      const canvas = fabricCanvasRef.current;
      const currentCustomizations = new Map(pageCustomizations);
      
      if (canvas && textObjectsRef.current.size > 0) {
        const updatedTexts = getUpdatedTextContent(textObjectsRef.current);
        const customizedData = {
          ...canvasData,
          textElements: textElements.map((el) => ({
            ...el,
            text: updatedTexts.find((ut) => ut.id === el.id)?.text || el.text,
          })),
        };

        currentCustomizations.set(currentPage, { canvasData: customizedData, previewDataUrl: '' });
      }

      const pageImages: string[] = [];

      // Render each page to canvas
      for (let i = 0; i < totalPages; i++) {
        const pageData = template.pages![i];
        const customization = currentCustomizations.get(i);
        const pageCanvasData = customization?.canvasData || pageData.canvasData;
        const pageTextElements: TextElement[] = pageCanvasData?.textElements || [];
        const pageBackgroundUrl = pageData?.imageUrl;
        const pageBackgroundId = pageData?.backgroundId;
        const pageWidth = pageCanvasData?.canvasWidth || 800;
        const pageHeight = pageCanvasData?.canvasHeight || 600;

        // Pre-load fonts for this page
        await loadFontsFromElements(pageTextElements, pageCanvasData?.customFonts).catch(
          (err) => console.warn('Font loading for PDF page failed:', err)
        );

        // Create temporary canvas for rendering
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = pageWidth;
        tempCanvas.height = pageHeight;

        const fabricCanvas = new Canvas(tempCanvas, {
          width: pageWidth,
          height: pageHeight,
          selection: false,
        });

        // Load and render page with text
        await loadTextOnlyCanvas({
          canvas: fabricCanvas,
          imageUrl: pageBackgroundUrl,
          backgroundId: pageBackgroundId,
          textElements: pageTextElements,
          canvasWidth: pageWidth,
          canvasHeight: pageHeight,
          scale: 1, // Full resolution
          customFonts: pageCanvasData?.customFonts,
        });

        // Wait for fonts and rendering
        await new Promise(resolve => setTimeout(resolve, 300));

        // Capture page as image
        const dataUrl = fabricCanvas.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 1,
        });

        pageImages.push(dataUrl);
        fabricCanvas.dispose();
      }

      // Create PDF with all pages
      const firstPageData = template.pages![0]?.canvasData || template.canvas_data;
      const pdfWidth = firstPageData?.canvasWidth || 800;
      const pdfHeight = firstPageData?.canvasHeight || 600;

      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
        unit: 'px',
        format: [pdfWidth, pdfHeight]
      });

      for (let i = 0; i < pageImages.length; i++) {
        if (i > 0) {
          pdf.addPage([pdfWidth, pdfHeight], pdfHeight > pdfWidth ? 'portrait' : 'landscape');
        }
        pdf.addImage(pageImages[i], 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      // Download PDF
      const fileName = `${template.name || 'card'}-${Date.now()}.pdf`;
      pdf.save(fileName);

    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const selectedTextElement = textElements.find((el) => el.id === selectedTextId);
  const isSelectedLocked = selectedTextElement?.locked ?? false;

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-8">
        {/* Canvas Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {error ? (
              <div className="h-96 flex items-center justify-center bg-red-50 border border-red-200">
                <div className="text-center">
                  <p className="text-red-700 font-semibold mb-2">Error Loading Canvas</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            ) : (
              <div className="relative">
                {/* Page Navigation for Multipage */}
                {isMultipage ? (
                  <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-200">
                    <button
                      onClick={() => onPageChange?.(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition"
                      aria-label="Previous page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-sm font-medium text-gray-700 min-w-20 text-center">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => onPageChange?.(Math.min(totalPages - 1, currentPage + 1))}
                      disabled={currentPage === totalPages - 1}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition"
                      aria-label="Next page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ):""}

                <div ref={containerRef} className="flex items-center justify-center bg-gray-50 p-6 min-h-100">
                  <canvas
                    ref={canvasRef}
                    className="border-2 border-gray-300 rounded-lg shadow-sm cursor-text"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Text Editor Sidebar (desktop) */}
        <div className="lg:col-span-1 hidden lg:block">
          <div className="bg-white rounded-xl shadow-lg p-6 sticky top-30">
            {selectedTextElement && !isSelectedLocked ? (
              <div className="space-y-4">
                {/* Text Area */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={selectedText}
                    onChange={handleTextChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={6}
                    placeholder="Enter text here..."
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">
                  {selectedTextId && isSelectedLocked
                    ? '🔒 This text field is locked and cannot be edited'
                    : 'Click on any text in the card to edit it'}
                </p>
              </div>
            )}
            {isMultipage ? (
              <div className="mt-6 flex items-center justify-between">
                {/* Previous */}
                <button
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={currentPage === 0}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition
      ${currentPage === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white border text-blue-600 hover:bg-blue-50'
                    }`}
                >
                  ← Previous
                </button>

                {/* Page info */}
                <span className="text-sm text-gray-600">
                  Page <span className="font-semibold">{currentPage + 1}</span>
                </span>

                {/* Next */}
                <button
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition
      ${currentPage >= totalPages - 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white border text-blue-600 hover:bg-blue-50'
                    }`}
                >
                  Next →
                </button>
              </div>

            ):""}

            {/* Publish Button - Only show on last page for multipage templates */}
            {(!isMultipage || currentPage === totalPages - 1) ? (
              <div className="mt-6 space-y-3">
                <button
                  onClick={handlePublish}
                  disabled={isSaving || isLoading}
                  className="w-full px-4 py-3 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(90deg, #d18b47, #b87435)' }}
                >
                  {isSaving || isLoading ? 'Preparing preview...' : 'Preview'}
                </button>

                {/* PDF Download for Multipage */}
                {isMultipage ? (
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf || isSaving || isLoading}
                    className="w-full px-4 py-3 bg-white border-2 border-[#d18b47] text-[#d18b47] font-semibold rounded-lg transition hover:bg-[#d18b47] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingPdf ? 'Generating PDF...' : '📄 Download as PDF'}
                  </button>
                ):""}
              </div>
            ):""}

          </div>
        </div>
      </div>

      {/* Mobile editor modal */}
      {isMobile && showMobileEditor && selectedTextElement && !isSelectedLocked && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 animate-fade-in-up">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Editing</p>
                <h3 className="text-lg font-semibold text-gray-900">{selectedTextElement?.label || 'Text Field'}</h3>
              </div>
              <button
                onClick={() => setShowMobileEditor(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                value={selectedText}
                onChange={handleTextChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d18b47] resize-none"
                rows={5}
                placeholder="Enter text here..."
              />

              <div className="bg-[#f3e4d6] border border-[#e4cdb4] rounded-lg p-4 text-xs text-[#8a5a24]">
                <p className="font-semibold text-[#b87435] mb-3">Locked Properties</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Font:</span>
                    <span className="font-medium">{selectedTextElement?.fontFamily || 'Arial'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-medium">{selectedTextElement?.fontSize}px</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Color:</span>
                    <span
                      className="w-6 h-6 rounded border border-[#e4cdb4]"
                      style={{ backgroundColor: selectedTextElement?.fill || '#000000' }}
                    ></span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowMobileEditor(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowMobileEditor(false);
                    handlePublish();
                  }}
                  disabled={isSaving || isLoading}
                  className="flex-1 px-4 py-2 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(90deg, #d18b47, #b87435)' }}
                >
                  {isSaving || isLoading ? 'Preparing preview...' : 'Save & Preview'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
