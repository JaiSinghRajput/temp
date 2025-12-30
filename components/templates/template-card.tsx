'use client';
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
  const handleCardClick = () => {
    if (onSelect) onSelect(template.id);
  };

  const handlePrimary = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPrimary) onPrimary(template.id);
  };

  const handleSecondary = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSecondary) onSecondary(template.id);
  };

  const imageUrl = template.thumbnail_uri || template.template_image_url;
  const created = template.created_at
    ? new Date(template.created_at).toLocaleDateString()
    : null;

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden group border border-gray-200"
    >
      <div className="relative h-64 bg-gray-100 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={template.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-6xl">🎴</span>
          </div>
        )}
        {badgeText && (
          <div className="absolute top-3 right-3">
            <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-bold">
              {badgeText}
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
          {template.name}
        </h3>

        {(template.category_name || template.subcategory_name) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {template.category_name && (
              <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                {template.category_name}
              </span>
            )}
            {template.subcategory_name && (
              <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                {template.subcategory_name}
              </span>
            )}
          </div>
        )}

        {template.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {template.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {created ? `Created ${created}` : 'Created date unknown'}
          </span>
          <div className="flex gap-2">
            {primaryLabel && onPrimary && (
              <button
                onClick={handlePrimary}
                className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                {primaryLabel}
              </button>
            )}
            {secondaryLabel && onSecondary && (
              <button
                onClick={handleSecondary}
                className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                {secondaryLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
