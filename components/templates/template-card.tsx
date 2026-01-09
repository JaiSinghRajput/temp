'use client';

import Image from 'next/image';
import { Template } from '@/lib/types';
import React from 'react';

type TemplateCardProps = {
  template: Template;
  onSelect?: (templateId: number) => void;
};

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const imageUrl =
    template.pages?.[0]?.previewImageUrl ||
    template.thumbnail_url ||
    template.template_image_url ||
    template.pages?.[0]?.imageUrl ||
    '/images/template.png';

  return (
    <div
      onClick={() => onSelect?.(template.id)}
      className="
        group
        cursor-pointer
        rounded-2xl
        overflow-hidden
        bg-white
        shadow-sm
        hover:shadow-xl
        transition-all
        duration-300
      "
    >
      {/* Image */}
      <div className="relative aspect-3/4 bg-gray-100 z-0">
        <Image
          src={imageUrl}
          alt={template.title}
          fill
          sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />

        {/* Optional Premium Badge */}
        {(template as any).pricing_type === 'premium' && (
          <span className="
            absolute top-3 right-3
            px-3 py-1
            text-xs font-semibold
            rounded-full
            bg-[#d18b47]
            text-white
            shadow
          ">
            Premium
          </span>
        )}
      </div>

      {/* Minimal Info */}
      <div className="px-3 py-2">
        <h3 className="text-sm font-medium text-gray-800 truncate">
          {template.title}
        </h3>
      </div>
    </div>
  );
}
