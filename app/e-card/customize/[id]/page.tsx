'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Template } from '@/lib/types';
import TextEditor from '@/app/e-card/_components/TextEditor';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { templateService, userEcardService } from '@/services';

export default function CustomizeECardPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  const { user } = useAuth();

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await templateService.getTemplateById(templateId);

      if (result.success && result.data) {
        setTemplate(result.data);
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

  const handlePublish = async ({ customizedData, previewDataUrl }: { customizedData: any; previewDataUrl?: string }) => {
    try {
      setPublishing(true);
      setError('');

      const result = await userEcardService.createUserEcard({
        template_id: Number(templateId),
        customized_data: customizedData,
        preview_uri: previewDataUrl,
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
        }
      } else {
        setError(result.error || 'Failed to publish card');
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
  if (loading) {
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
      {/* Header */}
      {/* <div className="bg-white border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Link
                href="/e-card"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primaryDark"
              >
                ← Back to Templates
              </Link>

              <h1 className="text-2xl font-semibold text-gray-900">
                Customize Invitation
              </h1>

              <p className="text-sm text-gray-500">
                {template.name}
              </p>
            </div>
          </div>
        </div>
      </div> */}

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
            canvasData={template.canvas_data}
            backgroundUrl={template.template_image_url}
            backgroundId={template.background_id}
            onPublish={handlePublish}
            isLoading={publishing}
          />
        </div>
      </div>
    </main>
  );
}
