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
  onPreview?: (payload: PublishPayload) => void;
  onPublish?: (payload: PublishPayload) => void;
  isLoading?: boolean;
}

export default function TextEditor({
  templateId,
  template,
  currentPage = 0,
  onPageChange,
  onPreview,
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

  // For multipage: use page-specific canvas data, for single: use template canvas_data
  const canvasData = isMultipage && currentPageData?.canvasData
    ? (pageCustomization?.canvasData || currentPageData.canvasData)
    : (pageCustomization?.canvasData || template.canvas_data);

  if (isMultipage && canvasData) {
    console.log(`[TextEditor] Page ${currentPage} using:`, {
      hasPageCustomization: !!pageCustomization,
      textElementsCount: canvasData.textElements?.length,
      firstTextElement: canvasData.textElements?.[0]?.text
    });
  }

  // For multipage: use page-specific background, for single: use template background
  const backgroundUrl = isMultipage
    ? (currentPageData?.imageUrl || template.template_image_url)
    : template.template_image_url;

  const backgroundId = isMultipage
    ? currentPageData?.backgroundId
    : template.background_id;

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
      stopContextMenu: true,

    });
    fabricCanvasRef.current = canvas;

    // Pre-load fonts from text elements BEFORE rendering canvas
    const fontLoadingPromise = loadFontsFromElements(textElements, canvasData?.customFonts)
      .then(() => {
        console.log('[TextEditor] Fonts loaded successfully');
        // Wait a bit more to ensure fonts are truly available
        return new Promise(resolve => setTimeout(resolve, 150));
      })
      .catch((err) => {
        console.warn('[TextEditor] Font loading failed, continuing anyway:', err);
        return new Promise(resolve => setTimeout(resolve, 150));
      });

    // Load canvas with text elements AFTER fonts are ready
    fontLoadingPromise.then(() => {
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
    });

    return () => {
      canvas.dispose();
    };
  }, [canvasData, backgroundUrl, backgroundId, canvasWidth, canvasHeight, isMobile, currentPage, template.id]);

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

  // Handle preview - prepares data and shows preview
  const handlePreview = async () => {
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

      if (onPreview) {
        await onPreview({
          customizedData: finalCustomizedData,
          previewDataUrl: isMultipage ? finalPreviewUrls?.[0] : previewDataUrl,
          previewUrls: isMultipage ? finalPreviewUrls : undefined,
        });
      }
    } catch (err) {
      console.error('Error previewing card:', err);
      setError('Failed to preview card');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle publish - saves the card directly
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
        // Save current page customization first
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

        // Collect all preview URLs
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
      const fileName = `${template.title || 'card'}-${Date.now()}.pdf`;
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
    <div>
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-0 lg:py-6">
          <div className="lg:col-span-2">
            {isMultipage && (
              <div className="flex justify-center mt-4 mb-3 px-4">
                <div className="flex items-center gap-2 overflow-x-auto max-w-[90vw]">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const isActive = idx === currentPage;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onPageChange?.(idx)}
                        className={`px-3 py-1.5 rounded-full border text-sm whitespace-nowrap transition
                  ${isActive
                            ? "bg-[#d18b47]/50 text-white border-[#d18b47]"
                            : "bg-white text-black border-gray-300 hover:bg-gray-100"
                          }`}
                      >
                        page {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {error ? (
              <div className="h-96 flex items-center justify-center bg-red-50 border">
                <div className="text-center">
                  <p className="text-red-700 font-semibold mb-2">Error Loading Canvas</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            ) : (

              <div
                ref={containerRef}
                className="flex items-center justify-center min-h-100 overflow-auto touch-pan-y"
              >
                <canvas
                  ref={canvasRef}
                  className="block cursor-text touch-pan-y"
                />
              </div>
            )}
            {/* Bottom Buttons*/}
            {(!isMultipage || currentPage === totalPages - 1) ? (
              <div className="flex gap-4 items-center max-w-120 mx-auto my-6 px-4">
                <button
                  onClick={handlePreview}
                  disabled={isSaving || isLoading}
                  className="w-full px-4 py-3 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(90deg, #d18b47, #b87435)' }}
                >
                  {isSaving || isLoading ? 'Preparing preview...' : '👁 Preview'}
                </button>

                {/* Publish Button - Only show on non-multipage or last page */}
                <button
                  onClick={handlePublish}
                  disabled={isSaving || isLoading}
                  className="w-full px-4 py-3 bg-white border-2 border-[#d18b47] text-[#d18b47] font-semibold rounded-lg transition hover:bg-[#d18b47] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving || isLoading ? 'Publishing...' : '✓ Publish'}
                </button>
              </div>
            ) : ""}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}