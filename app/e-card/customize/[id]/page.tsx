'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import { Template } from '@/lib/types';
import TextEditor from '@/app/e-card/_components/TextEditor';
import Link from 'next/link';
import { templateService, userEcardService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomizeECardPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPath = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  const loginHref = `/login?next=${encodeURIComponent(currentPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(currentPath)}`;

  const [template, setTemplate] = useState<Template | null>(null);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (templateId && user && !authLoading) {
      fetchTemplate();
    }
  }, [templateId, user, authLoading]);

  const fetchTemplate = async () => {
    try {
      setTemplateLoading(true);
      setError('');

      console.log('[CustomizePage] Fetching template with ID:', templateId);
      
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const result = await templateService.getTemplateById(templateId);
      clearTimeout(timeoutId);
      
      console.log('[CustomizePage] API result:', { success: result?.success, hasData: !!result?.data, result });

      if (result?.success && result?.data) {
        let tpl = result.data as Template;
        console.log('[CustomizePage] Template fetched:', {
          id: tpl.id,
          title: tpl.title,
          is_multipage: tpl.is_multipage,
          pages_count: tpl.pages?.length,
          has_canvas_data: !!tpl.canvas_data,
        });
        
        // Load draft from sessionStorage if available
        try {
          const draftKey = `ecard_draft_${templateId}_${user?.uid || 'guest'}`;
          const raw = typeof window !== 'undefined' ? sessionStorage.getItem(draftKey) : null;
          if (raw) {
            const draft = JSON.parse(raw);
            const customized = draft?.customized_data;
            console.log('[CustomizePage] Draft loaded:', {
              draftKey,
              isMultipage: customized?.is_multipage,
              pagesCount: customized?.pages?.length,
              firstPageTextElements: customized?.pages?.[0]?.canvasData?.textElements?.length,
              secondPageTextElements: customized?.pages?.[1]?.canvasData?.textElements?.length,
            });
            if (customized) {
              // Merge customized text elements back into template for editing again
              const isMulti = customized.is_multipage && Array.isArray(customized.pages);
              if (isMulti && Array.isArray(tpl.pages)) {
                console.log('[CustomizePage] Restoring multipage template');
                tpl = { ...tpl, pages: tpl.pages.map((p, idx) => ({
                  ...p,
                  canvasData: customized.pages?.[idx]?.canvasData || p.canvasData,
                })) } as Template;
              } else if (customized.textElements) {
                // For single page, the customized data is the entire canvas data
                tpl = { ...tpl, canvas_data: { ...tpl.canvas_data, ...customized } } as Template;
              }
            }
          }
        } catch (e) {
          console.warn('Failed to load draft from sessionStorage:', e);
        }
        setTemplate(tpl);
      } else {
        const errMsg = result?.error || result?.message || 'Template not found';
        console.error('[CustomizePage] API response was not successful:', errMsg, result);
        setError(errMsg);
      }
    } catch (err) {
      console.error('Error fetching template:', err);
      const errorMsg = err instanceof Error 
        ? (err.name === 'AbortError' ? 'Request timed out. Please try again.' : err.message)
        : 'Failed to load template';
      setError(errorMsg);
    } finally {
      setTemplateLoading(false);
    }
  };

  const handlePreview = async ({ customizedData, previewDataUrl, previewUrls }: { customizedData: any; previewDataUrl?: string; previewUrls?: string[] }) => {
    if (!user) {
      router.push(loginHref);
      return;
    }
    try {
      setPublishing(true);
      setError('');

      // Store draft in sessionStorage for preview page
      const draftKey = `ecard_draft_${templateId}_${user?.uid || 'guest'}`;
      const draft = {
        template_id: Number(templateId),
        customized_data: customizedData,
        preview_uri: previewDataUrl,
        preview_urls: previewUrls,
        user_id: user?.uid || undefined,
        user_name: user?.name || undefined,
      };
      sessionStorage.setItem(draftKey, JSON.stringify(draft));

      // Navigate to preview page
      router.push(`/e-card/preview?template_id=${templateId}&draft=${encodeURIComponent(draftKey)}`);
    } catch (err) {
      console.error('Error previewing card:', err);
      setError('Failed to preview card');
    } finally {
      setPublishing(false);
    }
  };

  const handlePublish = async ({ customizedData, previewDataUrl, previewUrls }: { customizedData: any; previewDataUrl?: string; previewUrls?: string[] }) => {
    if (!user) {
      router.push(loginHref);
      return;
    }
    try {
      setPublishing(true);
      setError('');

      // Directly publish the card
      const result = await userEcardService.createUserEcard({
        template_id: Number(templateId),
        customized_data: customizedData,
        preview_uri: previewDataUrl,
        preview_urls: previewUrls,
        user_id: user?.uid || undefined,
        user_name: user?.name || undefined,
      });

      if (result.success) {
        const catSlug = result.data?.category_slug;
        const subSlug = result.data?.subcategory_slug;
        const slug = result.data?.slug;
        if (slug) {
          if (catSlug && subSlug) {
            router.push(`/e-card/${catSlug}/${subSlug}/${slug}`);
          } else {
            router.push(`/e-card/${slug}`);
          }
        } else {
          router.push("/my-cards");
        }
      } else {
        setError(result.error || "Failed to publish card");
      }
    } catch (err) {
      console.error('Error publishing card:', err);
      setError('Failed to publish card');
    } finally {
      setPublishing(false);
    }
  };

  /* -----------------------------
     LOADING STATE
  ------------------------------ */
  if (templateLoading || authLoading) {
    return (
      <main className="min-h-screen bg-linear-to-br from-[#faf7f4] to-[#f3e4d6] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary mx-auto" />
          <p className="text-sm text-gray-600">
            Loading your template…
          </p>
        </div>
      </main>
    );
  }

  /* -----------------------------
     AUTH GUARD
  ------------------------------ */
  if (!user) {
    return (
      <main className="min-h-screen bg-linear-to-br from-[#faf7f4] to-[#f3e4d6] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Sign in to customize</h2>
          <p className="text-sm text-gray-600">Please login to personalize and publish this card.</p>
          <div className="flex justify-center gap-3">
            <Link
              href={loginHref}
              className="inline-flex justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primaryDark transition"
            >
              Login
            </Link>
            <Link
              href={registerHref}
              className="inline-flex justify-center rounded-lg bg-gray-100 px-6 py-2.5 text-sm font-semibold text-gray-800"
            >
              Register
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* -----------------------------
     ERROR STATE
  ------------------------------ */
  if (error || !template) {
    return (
      <main className="min-h-screen bg-linear-to-br from-[#faf7f4] to-[#f3e4d6] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Something went wrong
          </h2>

          <p className="text-sm text-gray-600">
            {error || 'Template not found'}
          </p>

          <Link
            href="/e-card"
            className="inline-flex justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primaryDark transition"
          >
            Back to Templates
          </Link>
        </div>
      </main>
    );
  }

  /* -----------------------------
     MAIN PAGE
  ------------------------------ */
  return (
    <main className="min-h-screen bg-linear-to-br from-[#faf7f4] via-[#fdfaf7] to-[#f3e4d6]">
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-6 py-4">
            <p className="text-sm font-medium text-red-700">
              {error}
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-primary/10">
          <TextEditor
            templateId={Number(templateId)}
            template={template}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPreview={handlePreview}
            onPublish={handlePublish}
            isLoading={publishing}
          />
        </div>
      </div>
    </main>
  );
}
