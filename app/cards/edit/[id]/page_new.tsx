"use client";

import { useEffect, useState, use } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MultiPageCanvas } from '@/components/canvas/MultiPageCanvas';
import Image from 'next/image';
import { Template, TextElement } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

export default function EditTemplate({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [templateData, setTemplateData] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageTextElements, setPageTextElements] = useState<TextElement[][]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(true);
  const [showPublishPreview, setShowPublishPreview] = useState(false);

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
          setDraftKey(`ecard-draft-${template.id}`);

          if (template.is_multipage && template.pages && template.pages.length > 0) {
            setPageTextElements(
              template.pages.map((page) => page.canvasData.textElements)
            );
          } else {
            setPageTextElements([template.canvas_data.textElements]);
          }

          applyDraftIfAny(template);
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

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handle = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    setIsMobile(mq.matches);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  const handleTextChange = (pageIndex: number, textId: string, newText: string) => {
    setPageTextElements((prev) => {
      if (!prev[pageIndex]) return prev;
      const updated = [...prev];
      updated[pageIndex] = updated[pageIndex].map((el) =>
        el.id === textId ? { ...el, text: newText } : el
      );
      return updated;
    });
    
    // Auto-save draft on every text change
    if (typeof window !== 'undefined') {
      const key = draftKey || `ecard-draft-${templateData?.id}`;
      if (key && templateData) {
        const draft = {
          templateId: templateData.id,
          pages: pageTextElements.map((page) => page.map((el) => ({ id: el.id, text: el.text }))),
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify(draft));
      }
    }
  };

  const applyDraftIfAny = (template: Template) => {
    if (typeof window === 'undefined') return;
    const key = `ecard-draft-${template.id}`;
    setDraftKey(key);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { pages?: { id: string; text: string }[][] };
      if (!parsed?.pages || parsed.pages.length === 0) return;

      setPageTextElements((prev) => {
        return prev.map((page, idx) => {
          const draftPage = parsed.pages?.[idx];
          if (!draftPage) return page;
          return page.map((el) => {
            const match = draftPage.find((d) => d.id === el.id);
            return match ? { ...el, text: match.text } : el;
          });
        });
      });
    } catch (err) {
      console.warn('Failed to parse draft', err);
    }
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

    if (!user) {
      if (typeof window !== 'undefined') {
        // Save draft before redirecting
        const key = draftKey || `ecard-draft-${templateData.id}`;
        const draft = {
          templateId: templateData.id,
          pages: pageTextElements.map((page) => page.map((el) => ({ id: el.id, text: el.text }))),
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify(draft));
        
        // Redirect to login with return URL pointing back to this edit page
        const returnUrl = `/cards/edit/${templateData.id}`;
        router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      }
      return;
    }

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
          user_id: user?.id ?? null,
          user_name: user?.name || user?.email || user?.mobile || null,
          customized_data: customized,
          preview_uri: null,
          preview_urls: null,
        }),
      });

      const result = await res.json();
      if (result.success) {
        if (typeof window !== 'undefined') {
          const key = draftKey || `ecard-draft-${templateData.id}`;
          localStorage.removeItem(key);
        }
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading template...</p>
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
    ? templateData.pages.map((page, idx) => {
        const canvasData = page.canvasData || (page as any).canvas_data || {};
        const imageUrl = (page as any).imageUrl || (page as any).image_url || templateData.template_image_url;
        const backgroundId = (page as any).backgroundId ?? (page as any).background_id ?? templateData.background_id;
        return {
          imageUrl,
          backgroundId,
          textElements: pageTextElements[idx] || canvasData.textElements || [],
          canvasWidth: canvasData.canvasWidth || templateData.canvas_data.canvasWidth,
          canvasHeight: canvasData.canvasHeight || templateData.canvas_data.canvasHeight,
        };
      })
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

  const selectedTextElement = selectedTextId
    ? currentPageTextElements.find((el) => el.id === selectedTextId) || null
    : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {showPublishPreview ? (
        <PublishPreviewScreen
          templateData={templateData}
          pageTextElements={pageTextElements}
          pages={pages}
          isPublishing={isPublishing}
          onPublish={publishCard}
          onBack={() => setShowPublishPreview(false)}
          isMobile={isMobile}
        />
      ) : (
        <>
          <div className="flex-1 relative">
            {/* Loading Overlay - appears over canvas during load */}
            {isLoadingCanvas && (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center z-40">
                <div className="bg-white rounded-xl shadow-2xl p-12 text-center max-w-sm">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                  <p className="text-gray-700 font-semibold mb-2">Loading Canvas</p>
                  <p className="text-sm text-gray-500">Please wait while we prepare your template...</p>
                </div>
              </div>
            )}
            
            {/* Canvas - always mounted for Fabric.js */}
            <MultiPageCanvas
              pages={pages}
              customFonts={
                templateData.is_multipage && templateData.pages
                  ? Array.from(
                      new Map(
                        templateData.pages
                          .flatMap((p) => (p.canvasData || (p as any).canvas_data || {}).customFonts || [])
                          .concat(templateData.canvas_data.customFonts || [])
                          .map((f) => [f.name, f])
                      ).values()
                    )
                  : templateData.canvas_data.customFonts
              }
              onTextChange={handleTextChange}
              onPageChange={setCurrentPageIndex}
              onTextSelect={(pageIdx, textId) => {
                setCurrentPageIndex(pageIdx);
                if (isMobile) {
                  setSelectedTextId(textId);
                }
              }}
              onLoadingChange={setIsLoadingCanvas}
              isMobile={isMobile}
              className="md:flex-1"
            />
          </div>

          {!isMobile && (
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
                      onClick={() => setShowPublishPreview(true)}
                      className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700"
                    >
                      Review & Publish
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
          )}

          {isMobile && (
            <div className="mt-4 w-full px-4 pb-6">
              <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => currentPageIndex > 0 && setCurrentPageIndex((prev) => prev - 1)}
                  disabled={currentPageIndex === 0}
                  className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-200 disabled:opacity-50"
                >
                  ← Previous
                </button>
                {currentPageIndex < pages.length - 1 ? (
                  <button
                    onClick={saveAndNext}
                    className="flex-1 bg-primary text-white py-3 rounded-lg font-bold hover:bg-primary/90"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={() => setShowPublishPreview(true)}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700"
                  >
                    Review & Publish
                  </button>
                )}
              </div>
            </div>
          )}

          {isMobile && selectedTextElement && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Editing text</p>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedTextElement.label || 'Text field'}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedTextId(null)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <input
                  type="text"
                  value={selectedTextElement.text}
                  onChange={(e) => handleTextChange(currentPageIndex, selectedTextElement.id, e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSelectedTextId(null)}
                    className="px-4 py-2 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Publish Preview Screen Component
function PublishPreviewScreen({
  templateData,
  pageTextElements,
  pages,
  isPublishing,
  onPublish,
  onBack,
  isMobile,
}: {
  templateData: any;
  pageTextElements: any[][];
  pages: any[];
  isPublishing: boolean;
  onPublish: () => void;
  onBack: () => void;
  isMobile: boolean;
}) {
  const [currentPreviewPage, setCurrentPreviewPage] = useState(0);

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Left: Preview */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 overflow-auto">
          <div className="shadow-2xl rounded-lg overflow-hidden border border-gray-200 bg-white max-w-2xl w-full">
            {pages[currentPreviewPage]?.imageUrl && (
              <img
                src={pages[currentPreviewPage].imageUrl}
                alt={`Preview page ${currentPreviewPage + 1}`}
                className="w-full h-auto"
              />
            )}
          </div>
        </div>

        {/* Page Navigation */}
        {pages.length > 1 && (
          <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrentPreviewPage((p) => Math.max(0, p - 1))}
              disabled={currentPreviewPage === 0}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPreviewPage + 1} of {pages.length}
            </span>
            <button
              onClick={() => setCurrentPreviewPage((p) => Math.min(pages.length - 1, p + 1))}
              disabled={currentPreviewPage === pages.length - 1}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Right: Summary & Publish */}
      <div className="w-full md:w-96 bg-white border-l border-gray-200 flex flex-col p-6 gap-6 shadow-xl overflow-y-auto">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
          >
            ← Back to Editor
          </button>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">{templateData.name}</h2>
          <p className="text-sm text-gray-600">{templateData.description}</p>
        </div>

        {/* Content Summary */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Content Summary</h3>
          <div className="space-y-3">
            {pages.length > 1 && (
              <div className="text-sm">
                <span className="text-gray-600">Pages: </span>
                <span className="font-semibold text-gray-800">{pages.length}</span>
              </div>
            )}
            {pageTextElements.map((texts, pageIdx) => (
              <div key={pageIdx} className="text-sm">
                <span className="text-gray-600">
                  {pages.length > 1 ? `Page ${pageIdx + 1}` : 'Content'}:
                </span>
                <div className="mt-1 space-y-1 ml-2">
                  {texts.map((el) => (
                    <div key={el.id} className="text-xs text-gray-700 truncate">
                      <span className="font-medium">{el.label}:</span> {el.text || '(empty)'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Publish Section */}
        <div className="border-t pt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              ✓ Your card is ready to publish! Once published, it will be available for sharing and viewing.
            </p>
          </div>

          <button
            onClick={onPublish}
            disabled={isPublishing}
            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition text-lg mb-3"
          >
            {isPublishing ? 'Publishing...' : '✓ Publish Card'}
          </button>

          <button
            onClick={onBack}
            disabled={isPublishing}
            className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-300 disabled:opacity-60 transition"
          >
            Edit More
          </button>
        </div>

        <div className="text-xs text-gray-500 text-center border-t pt-4">
          <p>Published cards can be shared via unique links or QR codes.</p>
        </div>
      </div>
    </div>
  );
}
