'use client';

import Link from 'next/link';
import { Template } from '@/lib/types';
import { slugify } from '@/lib/utils';
import { COLOR_OPTIONS } from '@/lib/constants';
import { ColorSelect } from '@/components/ui/color-select';
import { CategorySidebar } from '@/components/layout/catalog';
import { TemplateCard } from '@/components/templates/template-card';
import { useEffect, useState } from 'react';
import colorService from '@/services/color.service';

interface VideoTemplate {
  id: number;
  title: string;
  slug: string;
  description?: string;
  preview_video_url: string;
  preview_thumbnail_url?: string;
  is_active: boolean;
}

interface ListViewProps {
  categories: any[];
  activeCategory?: string;
  activeSubcategory?: string;
  onCategorySelect: (category?: string, subcategory?: string) => void;
  colorFilter: string;
  onColorChange: (value: string) => void;
  loading: boolean;
  error: string;
  onRetry: () => void;
  templates: Template[];
  videoTemplates: VideoTemplate[];
}

export function ListView({
  categories,
  activeCategory,
  activeSubcategory,
  onCategorySelect,
  colorFilter,
  onColorChange,
  loading,
  error,
  onRetry,
  templates,
  videoTemplates,
}: ListViewProps) {
  const [colors, setColors] = useState<Array<{ id: number; name: string; hex_code: string }>>([]);
  useEffect(() => {
    const loadColors = async () => {
      try {
        const fetchedColors = await colorService.getAll();
        if (fetchedColors.length > 0) {
          setColors(fetchedColors);
        }
      } catch (err) {
        console.error('Error loading colors:', err);
      }
    };
    loadColors();
  }, []);
  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-14">
      {loading ? (
        <div className="flex flex-col items-center py-24">
          <div className="w-12 h-12 border-4 border-[#d18b47] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading templates…</p>
        </div>
      ) : (
        <div className="space-y-20 grid lg:grid-cols-4 lg:gap-8 lg:space-y-0">
          <CategorySidebar
            categories={categories}
            activeCategory={activeCategory}
            activeSubcategory={activeSubcategory}
            onSelect={onCategorySelect}
            className="col-span-1"
          />

          <section className="col-span-3 space-y-12">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-gray-900">E-Cards</h2>
                <p className="text-sm text-gray-600">
                  Personalize a beautiful digital card
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ColorSelect
                  options={colors.map(color => ({ label: color.name, value: color.hex_code }))}
                  value={colorFilter}
                  onChange={onColorChange}
                  includeAll
                  className="min-w-55"
                />
                {activeCategory || activeSubcategory ? (
                  <button
                    className="text-sm text-gray-600 underline hover:text-gray-900"
                    onClick={() => onCategorySelect(undefined, undefined)}
                  >
                    Clear category filter
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="group relative">
                  <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-white via-white to-[#fef7ee] opacity-0 group-hover:opacity-100 transition" aria-hidden />
                  <TemplateCard
                    template={template}
                    onSelect={(id) => {
                      const cardSlug = slugify(template.name || '');
                      const catSlug = template.category_name ? slugify(template.category_name) : '';
                      const subcatSlug = template.subcategory_name ? slugify(template.subcategory_name) : '';
                      const path = catSlug && subcatSlug
                        ? `/e-card/${catSlug}/${subcatSlug}/${cardSlug}`
                        : catSlug
                          ? `/e-card/${catSlug}/${cardSlug}`
                          : `/e-card/${cardSlug}`;
                      window.location.href = path;
                    }}
                  />
                </div>
              ))}

              {templates.length === 0 && (
                <div className="col-span-full rounded-2xl p-10 text-center text-gray-600">
                  No cards matching this criteria
                </div>
              )}
            </div>

            {videoTemplates.length > 0 && (
              <section className="space-y-4">
                <div className="mb-2">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Video Invitations
                  </h2>
                  <p className="text-sm text-gray-600">
                    Animated invitations with custom details
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videoTemplates.map(video => (
                    <div
                      key={video.id}
                      className="bg-white rounded-2xl border shadow-sm hover:shadow-lg transition overflow-hidden"
                    >
                      <div className="relative h-60 bg-gray-100 flex items-center justify-center">
                        {video.preview_thumbnail_url ? (
                          <img
                            src={video.preview_thumbnail_url}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl">▶</span>
                        )}
                        <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold bg-white border">
                          Video
                        </span>
                      </div>

                      <div className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {video.title}
                        </h3>

                        <Link
                          href={`/e-video/${video.slug}`}
                          className="block w-full text-center py-2.5 bg-[#d18b47] text-white rounded-lg font-semibold hover:bg-[#c07c3c] transition"
                        >
                          Create Video Invitation
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
