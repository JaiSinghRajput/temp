"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { MultiPageCanvas } from '@/components/canvas/MultiPageCanvas';
import { Template, TextElement } from '@/lib/types';

export default function EditTemplate({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();

  const [templateData, setTemplateData] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageTextElements, setPageTextElements] = useState<TextElement[][]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  // Fetch template from database
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const templateId = unwrappedParams.id;
        const response = await fetch(`/api/templates/${templateId}`);
        const result = await response.json();

        if (result.success) {
          const template = result.data as Template;
          setTemplateData(template);

          if (template.is_multipage && template.pages && template.pages.length > 0) {
            setPageTextElements(
              template.pages.map((page) => page.canvasData.textElements)
            );
          } else {
            setPageTextElements([template.canvas_data.textElements]);
          }
        } else {
          setError('Template not found');
        }
      } catch (err) {
        console.error('Error fetching template:', err);
        setError('Failed to load template');
      } finally {
        setLoading(false);
      }
    };

    if (unwrappedParams.id) {
      fetchTemplate();
    } else {
      setError('No template ID provided');
      setLoading(false);
    }
  }, [unwrappedParams.id]);

  const handleTextChange = (pageIndex: number, textId: string, newText: string) => {
    setPageTextElements((prev) => {
      if (!prev[pageIndex]) return prev;
      const updated = [...prev];
      updated[pageIndex] = updated[pageIndex].map((el) =>
        el.id === textId ? { ...el, text: newText } : el
      );
      return updated;
    });
  };

  const resetToDefault = () => {
    if (!templateData) return;

    if (templateData.is_multipage && templateData.pages) {
      setPageTextElements(
        templateData.pages.map((page) => page.canvasData.textElements)
      );
    } else {
      setPageTextElements([templateData.canvas_data.textElements]);
    }
    setCurrentPageIndex(0);
  };

  const saveAndNext = () => {
    if (!templateData) return;
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex((prev) => prev + 1);
    }
  };

  const publishCard = async () => {
    if (!templateData) return;
    setIsPublishing(true);
    try {
      const customized = templateData.is_multipage && templateData.pages
        ? {
            is_multipage: true,
            pages: templateData.pages.map((p, idx) => ({
              imageUrl: p.imageUrl,
              canvasData: {
                ...p.canvasData,
                textElements: pageTextElements[idx] || p.canvasData.textElements,
              },
            })),
          }
        : {
            is_multipage: false,
            textElements: pageTextElements[0] || templateData.canvas_data.textElements,
            canvasWidth: templateData.canvas_data.canvasWidth,
            canvasHeight: templateData.canvas_data.canvasHeight,
          };

      const res = await fetch('/api/user-ecards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateData.id,
          customized_data: customized,
          preview_uri: null,
          preview_urls: null,
        }),
      });

      const result = await res.json();
      if (result.success) {
        router.push(`/cards/${result.data.slug}`);
      } else {
        alert(result.error || 'Failed to publish card');
      }
    } catch (err) {
      console.error('Publish failed:', err);
      alert('Failed to publish card');
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error || !templateData) {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-6 md:p-10 rounded-2xl shadow-2xl max-w-md w-full">
          <div className="text-4xl md:text-6xl mb-4">❌</div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-sm md:text-base text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/templates')}
            className="bg-primary hover:bg-primary/90 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold transition text-sm md:text-base"
          >
            Back to Templates
          </button>
        </div>
      </div>
    );
  }

  const pages = templateData.is_multipage && templateData.pages && templateData.pages.length > 0
    ? templateData.pages.map((page, idx) => ({
        imageUrl: page.imageUrl,
        backgroundId: page.backgroundId,
        textElements: pageTextElements[idx] || page.canvasData.textElements || [],
        canvasWidth: page.canvasData.canvasWidth,
        canvasHeight: page.canvasData.canvasHeight,
      }))
    : [
        {
          imageUrl: templateData.template_image_url,
          backgroundId: templateData.background_id,
          textElements: pageTextElements[0] || templateData.canvas_data.textElements || [],
          canvasWidth: templateData.canvas_data.canvasWidth,
          canvasHeight: templateData.canvas_data.canvasHeight,
        },
      ];

  console.log('Pages constructed:', {
    pagesCount: pages.length,
    firstPageImageUrl: pages[0]?.imageUrl,
    firstPageBackgroundId: pages[0]?.backgroundId,
    firstPageTextElements: pages[0]?.textElements?.length,
    canvasWidth: pages[0]?.canvasWidth,
    canvasHeight: pages[0]?.canvasHeight,
  });

  const currentPageTextElements = pageTextElements[currentPageIndex] || [];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <MultiPageCanvas
        pages={pages}
        customFonts={templateData.canvas_data.customFonts}
        onTextChange={handleTextChange}
        onPageChange={setCurrentPageIndex}
        className="md:flex-1"
      />

      <div className="w-full md:w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col p-6 gap-6 overflow-y-auto">
        <div className="border-b pb-4">
          <button
            onClick={() => router.push('/templates')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-3 flex items-center gap-1"
          >
            ← Back to Templates
          </button>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{templateData.name}</h1>
          <p className="text-sm text-gray-500">{templateData.description}</p>
          {pages.length > 1 && (
            <p className="text-xs text-blue-600 mt-2">Multi-page template ({pages.length} pages)</p>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Edit Text Fields</label>
          {currentPageTextElements.length === 0 ? (
            <div className="text-center text-gray-400 text-sm">All fields are locked for this page.</div>
          ) : (
            <div className="space-y-3">
              {currentPageTextElements.map((element) => (
                <div key={element.id}>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">{element.label}</label>
                  <input
                    type="text"
                    value={element.text}
                    onChange={(e) => handleTextChange(currentPageIndex, element.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => currentPageIndex > 0 && setCurrentPageIndex((prev) => prev - 1)}
              disabled={currentPageIndex === 0}
              className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-300 disabled:opacity-50"
            >
              ← Previous
            </button>
            {currentPageIndex < pages.length - 1 ? (
              <button
                onClick={saveAndNext}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90"
              >
                Save & Next →
              </button>
            ) : (
              <button
                onClick={publishCard}
                disabled={isPublishing}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-60"
              >
                {isPublishing ? 'Publishing...' : 'Publish Card'}
              </button>
            )}
          </div>

          <button
            onClick={resetToDefault}
            className="w-full bg-gray-200 text-gray-700 py-2 rounded-xl font-medium hover:bg-gray-300 transition"
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
}