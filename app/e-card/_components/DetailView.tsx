'use client';

import Link from 'next/link';
import { Template } from '@/lib/types';

interface TemplateDetailProps {
  template?: Template | null;
  loading: boolean;
  error?: string;
  onRetry: () => void;
}

export function DetailView({ template, loading, error, onRetry }: TemplateDetailProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center py-20">
        <div className="w-12 h-12 border-4 border-[#d18b47] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600">Loading card…</p>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="bg-white border rounded-2xl p-8 text-center">
        <p className="text-red-600">{error || 'Card not found'}</p>
        <button
          onClick={onRetry}
          className="mt-6 px-6 py-2.5 bg-[#d18b47] text-white rounded-lg font-semibold"
        >
          Try again
        </button>
      </div>
    );
  }

  const previewSrc = template.thumbnail_uri
    || template.template_image_url
    || template.pages?.[0]?.imageUrl
    || '';

  return (
    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
      <div className="relative w-full" style={{ aspectRatio: '4 / 5', background: '#f3e4d6' }}>
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={template.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">No preview</div>
        )}
        <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/90 text-xs font-semibold border">Preview</span>
      </div>

      <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{template.name}</h2>
          {template.description && (
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">{template.description}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/e-card/customize/${template.id}`}
            className="px-5 py-2.5 rounded-lg bg-[#d18b47] text-white font-semibold hover:bg-[#c07c3c] transition"
          >
            Customize
          </Link>
          <Link
            href="/e-card"
            className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-800 font-semibold hover:border-gray-300 transition"
          >
            Back to catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
