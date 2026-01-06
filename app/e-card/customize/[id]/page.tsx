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
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      setTemplateLoading(true);
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
      setTemplateLoading(false);
    }
  };

  const handlePublish = async ({ customizedData, previewDataUrl }: { customizedData: any; previewDataUrl?: string }) => {
    if (!user) {
      router.push(loginHref);
      return;
    }
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
            template={template}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPublish={handlePublish}
            isLoading={publishing}
          />
        </div>
      </div>
    </main>
  );
}
