'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Template } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import type { CarouselApi } from '@/components/ui/carousel';

interface TemplateDetailProps {
  template?: Template | null;
  loading: boolean;
  error?: string;
  onRetry: () => void;
}

export function DetailView({
  template,
  loading,
  error,
  onRetry,
}: TemplateDetailProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  const [api, setApi] = useState<CarouselApi | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // ----------------------------------
  // Pages (safe even when template undefined)
  // ----------------------------------
  const pages = useMemo(() => {
    if (!template) return [];

    return template.is_multipage && template.pages?.length
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
  }, [template]);

  // ----------------------------------
  // Carousel sync
  // ----------------------------------
  useEffect(() => {
    if (!api) return;

    const onSelect = () => setCurrentPage(api.selectedScrollSnap());

    api.on('select', onSelect);
    setCurrentPage(api.selectedScrollSnap());

    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  const handlePageClick = (idx: number) => {
    setCurrentPage(idx);
    api?.scrollTo(idx);
  };

  // ----------------------------------
  // Loading / Error
  // ----------------------------------
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

  // ----------------------------------
  // Auth-aware Customize link
  // ----------------------------------
  const customizePath = `/e-card/customize/${template.id}`;
  const loginHref = `/login?next=${encodeURIComponent(customizePath)}`;
  const customizeHref = user ? customizePath : loginHref;

  // ----------------------------------
  // Render
  // ----------------------------------
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-4">
        {/* Page buttons */}
        {pages.length > 1 && (
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {pages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handlePageClick(idx)}
                className={`px-5 py-2 rounded-full text-sm font-medium border transition-all shadow-sm
                  ${
                    idx === currentPage
                      ? 'bg-blue-50 text-black border-[#e9ad99]/60'
                      : 'bg-transparent text-black/80 hover:border-[#e9ad99]/60'
                  }
                `}
              >
                page {idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* Preview */}
        <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl">
          <div className="rounded-xs overflow-hidden bg-black shadow-sm">
            <Carousel opts={{ loop: false }} setApi={setApi}>
              <CarouselContent>
                {pages.map((page: any, idx) => (
                  <CarouselItem key={idx}>
                    {page.previewImageUrl || page.imageUrl ? (
                      <img
                        src={page.previewImageUrl || page.imageUrl}
                        alt={`${template.title} page ${idx + 1}`}
                        className="w-full h-auto object-contain"
                      />
                    ) : (
                      <div className="aspect-3/4 w-full flex items-center justify-center text-gray-400">
                        No preview
                      </div>
                    )}
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-10 flex flex-col items-center text-center">
        <Link
          href={customizeHref}
          className="w-full px-6 py-2.5 rounded-xl bg-[#d18b47] text-white font-semibold hover:bg-[#c07c3c]"
        >
          Customize Card
        </Link>

        {!user && (
          <p className="mt-3 text-sm text-gray-600">
            Login or register to customize this card
          </p>
        )}
      </div>
    </div>
  );
}
