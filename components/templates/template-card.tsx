'use client';
import Image from 'next/image';
import { Template } from '@/lib/types';
import React from 'react';

type TemplateCardProps = {
  template: Template;
  onSelect?: (templateId: number) => void;
  primaryLabel?: string;
  onPrimary?: (templateId: number) => void;
  secondaryLabel?: string;
  onSecondary?: (templateId: number) => void;
  badgeText?: string;
};

export function TemplateCard({
  template,
  onSelect,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  badgeText,
}: TemplateCardProps) {
  const imageUrl =
    template.thumbnail_uri ||
    template.template_image_url ||
    template.pages?.[0]?.imageUrl ||
    '';

  const created = template.created_at
    ? new Date(template.created_at).toLocaleDateString()
    : '—';

  return (
    <div
      onClick={() => onSelect?.(template.id)}
      className="
        bg-white
        border border-gray-200
        rounded-lg
        overflow-hidden
        cursor-pointer
        transition
        hover:shadow-sm
      "
    >
      {/* Image */}
      <div className="relative aspect-[3/4] bg-gray-50 border-b border-gray-200">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={template.name}
            fill
            sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 100vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">
            No preview
          </div>
        )}

        {badgeText && (
          <span className="absolute top-2 right-2 text-xs px-2 py-0.5 border border-gray-300 bg-white text-gray-700 rounded">
            {badgeText}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <h3 className="text-base font-semibold text-gray-900 truncate">
          {template.name}
        </h3>

        {(template.category_name || template.subcategory_name) && (
          <div className="flex gap-2 text-xs text-gray-600">
            {template.category_name && (
              <span>{template.category_name}</span>
            )}
            {template.subcategory_name && (
              <span>• {template.subcategory_name}</span>
            )}
          </div>
        )}

        {template.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {template.description}
          </p>
        )}

        {(template as any).pricing_type === 'premium' && (
          <div className="text-sm font-medium text-gray-900">
            ₹{((template as any).price || 0).toFixed(2)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Created {created}
        </span>

        <div className="flex gap-2">
          {primaryLabel && onPrimary && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrimary(template.id);
              }}
              className="
                px-3 py-1.5
                text-sm
                border border-gray-300
                rounded
                text-gray-800
                hover:bg-gray-100
              "
            >
              {primaryLabel}
            </button>
          )}

          {secondaryLabel && onSecondary && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSecondary(template.id);
              }}
              className="
                px-3 py-1.5
                text-sm
                border border-gray-300
                rounded
                text-red-600
                hover:bg-red-50
              "
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
