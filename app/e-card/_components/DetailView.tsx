'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Template } from '@/lib/types';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

import Autoplay from 'embla-carousel-autoplay';

interface TemplateDetailProps {
  template?: Template | null;
  loading: boolean;
  error?: string;
  onRetry: () => void;
}

export function DetailView({ template, loading, error, onRetry }: TemplateDetailProps) {
  const [currentPage, setCurrentPage] = useState(0);

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

  const pages =
    template.is_multipage && template.pages?.length
      ? template.pages
      : [
          {
            imageUrl:
              template.pages?.[0]?.previewImageUrl ||
              template.thumbnail_url ||
              template.template_image_url ||
              template.pages?.[0]?.imageUrl,
          },
        ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-10">

        {/* PREVIEW */}
        <div className="relative">
          <div
            className="sticky top-24 rounded-3xl bg-[#f3e4d6] shadow-sm"
          >
            <Carousel
              opts={{ loop: true }}
              plugins={[
                Autoplay({
                  delay: 4000,
                  stopOnInteraction: true,
                }),
              ]}
              setApi={(api) => {
                if (!api) return;
                api.on('select', () => setCurrentPage(api.selectedScrollSnap()));
              }}
            >
              <CarouselContent>
                {pages.map((page, idx) => (
                  <CarouselItem key={idx}>
                    {(page as any).previewImageUrl || page.imageUrl ? (
                      <img
                        src={(page as any).previewImageUrl || page.imageUrl}
                        alt={`${template.title} page ${idx + 1}`}
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No preview
                      </div>
                    )}
                  </CarouselItem>
                ))}
              </CarouselContent>

              {pages.length > 1 && (
                <div className='md:block hidden'>
                  <CarouselPrevious />
                  <CarouselNext />
                </div>
              )}
            </Carousel>

            {/* Page Indicator */}
            <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/90 text-xs font-semibold border">
              {pages.length > 1
                ? `Page ${currentPage + 1} of ${pages.length}`
                : 'Preview'}
            </span>

            {/* Dots */}
            {pages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {pages.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentPage
                        ? 'w-6 bg-[#d18b47]'
                        : 'w-2 bg-white/70'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* DETAILS */}
        <div className="flex flex-col justify-start pt-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900">
            {template.title}
          </h1>

          {template.description && (
            <p className="text-base text-gray-600 mt-4 max-w-xl">
              {template.description}
            </p>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              href={`/e-card/customize/${template.id}`}
              className="p-2 py-2.5 rounded-xl bg-[#d18b47] text-white font-semibold text-center hover:bg-[#c07c3c]"
            >
              Customize Card
            </Link>

            <Link
              href="/e-card"
              className="p-2 py-2.5 rounded-xl border border-gray-300 text-gray-800 font-semibold text-center hover:border-gray-400"
            >
              Back to catalog
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
