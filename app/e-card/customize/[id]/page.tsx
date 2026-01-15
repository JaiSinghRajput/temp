'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import { Template } from '@/lib/types';
import TextEditor from '@/app/e-card/_components/TextEditor';
import { templateService, userEcardService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomizeECardPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 🔐 Preserve full path for redirect
  const currentPath = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  const authHref = `/login?next=${encodeURIComponent(currentPath)}`;

  const [template, setTemplate] = useState<Template | null>(null);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  /* ----------------------------------
     🔁 AUTO-REDIRECT IF NOT AUTHENTICATED
  ----------------------------------- */
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(authHref);
    }
  }, [user, authLoading, authHref, router]);

  /* ----------------------------------
     FETCH TEMPLATE (AUTH ONLY)
  ----------------------------------- */
  useEffect(() => {
    if (!templateId || !user || authLoading) return;
    fetchTemplate();
  }, [templateId, user, authLoading]);

  const fetchTemplate = async () => {
    try {
      setTemplateLoading(true);
      setError('');

      const result = await templateService.getTemplateById(templateId);

      if (result?.success && result?.data) {
        let tpl = result.data as Template;

        // Restore draft if exists
        try {
          const draftKey = `ecard_draft_${templateId}_${user?.uid}`;
          const raw = sessionStorage.getItem(draftKey);
          if (raw) {
            const draft = JSON.parse(raw);
            const customized = draft?.customized_data;

            if (customized) {
              const isMulti = customized.is_multipage && Array.isArray(customized.pages);
              if (isMulti && Array.isArray(tpl.pages)) {
                tpl = {
                  ...tpl,
                  pages: tpl.pages.map((p, idx) => ({
                    ...p,
                    canvasData: customized.pages?.[idx]?.canvasData || p.canvasData,
                  })),
                } as Template;
              } else if (customized.textElements) {
                tpl = {
                  ...tpl,
                  canvas_data: { ...tpl.canvas_data, ...customized },
                } as Template;
              }
            }
          }
        } catch (e) {
          console.warn('Failed to restore draft:', e);
        }

        setTemplate(tpl);
      } else {
        setError(result?.error || 'Template not found');
      }
    } catch (err) {
      setError('Failed to load template');
    } finally {
      setTemplateLoading(false);
    }
  };

  /* ----------------------------------
     PREVIEW
  ----------------------------------- */
  const handlePreview = async ({
    customizedData,
    previewDataUrl,
    previewUrls,
  }: {
    customizedData: any;
    previewDataUrl?: string;
    previewUrls?: string[];
  }) => {
    try {
      setPublishing(true);
      setError('');

      const draftKey = `ecard_draft_${templateId}_${user?.uid}`;
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          template_id: Number(templateId),
          customized_data: customizedData,
          preview_uri: previewDataUrl,
          preview_urls: previewUrls,
          user_id: user?.uid,
          user_name: user?.name,
        })
      );

      router.push(`/e-card/preview?template_id=${templateId}&draft=${encodeURIComponent(draftKey)}`);
    } catch {
      setError('Failed to preview card');
    } finally {
      setPublishing(false);
    }
  };

  /* ----------------------------------
     PUBLISH
  ----------------------------------- */
  const handlePublish = async ({
    customizedData,
    previewDataUrl,
    previewUrls,
  }: {
    customizedData: any;
    previewDataUrl?: string;
    previewUrls?: string[];
  }) => {
    try {
      setPublishing(true);
      setError('');

      const result = await userEcardService.createUserEcard({
        template_id: Number(templateId),
        customized_data: customizedData,
        preview_uri: previewDataUrl,
        preview_urls: previewUrls,
        user_id: user?.uid,
        user_name: user?.name,
      });

      if (result.success) {
        const slug = result.data?.public_slug;
        if (slug) {
          router.push(`/e-card/${slug}`);
        } else {
          router.push('/my-cards');
        }
      } else {
        setError(result.error || 'Failed to publish card');
      }
    } catch {
      setError('Failed to publish card');
    } finally {
      setPublishing(false);
    }
  };

  /* ----------------------------------
     LOADING
  ----------------------------------- */
  if (authLoading || templateLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </main>
    );
  }

  /* ----------------------------------
     ERROR
  ----------------------------------- */
  if (error || !template) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error || 'Template not found'}</p>
      </main>
    );
  }

  /* ----------------------------------
     EDITOR (AUTHENTICATED)
  ----------------------------------- */
  return (
    <main className="min-h-screen bg-linear-to-br from-[#faf7f4] via-[#fdfaf7] to-[#f3e4d6]">
      <div className="max-w-7xl mx-auto px-4 py-8">
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
    </main>
  );
}
