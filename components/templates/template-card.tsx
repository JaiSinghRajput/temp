"use client";

import Image from "next/image";
import React from "react";
import { Template } from "@/lib/types";

type TemplateCardProps = {
  template: Template;
  onSelect?: (templateId: number) => void;
};

export function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const imageUrl =
    template.pages?.[0]?.previewImageUrl ||
    (template as any).thumbnail_url ||
    (template as any).template_image_url ||
    template.pages?.[0]?.imageUrl ||
    "/images/template.png";

  const isPremium = (template as any).pricing_type === "premium";

  // category text in screenshot like: "italic"
  const categoryText =
    (template as any)?.subcategory_slug ||
    (template as any)?.category_slug ||
    (template as any)?.category ||
    "";

  const price =
    (template as any)?.price ??
    (template as any)?.template_price ??
    (template as any)?.final_price ??
    0;

  const formattedPrice =
    Number(price) > 0 ? `₹${Number(price).toFixed(2)}` : "Free";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(template.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect?.(template.id)}
      className="
        group
        cursor-pointer
        overflow-hidden
        rounded-xl
        border
        border-gray-200
        bg-white
        shadow-sm
        hover:shadow-lg
        transition-all
        duration-300
        active:scale-[0.99]
      "
    >
      {/* Image */}
      <div className="relative w-full bg-gray-100">
        {/* 3:4 ratio exactly like screenshot */}
        <div className="relative w-full pt-[133.333%]">
          <Image
            src={imageUrl}
            alt={template.title}
            fill
            sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            unoptimized
            priority={false}
          />
        </div>

        {/* Premium badge (optional, top-right) */}
        {isPremium && (
          <span
            className="
              absolute
              top-3
              right-3
              rounded-full
              bg-[#d18b47]
              px-3
              py-1
              text-xs
              font-semibold
              text-white
              shadow
            "
          >
            Premium
          </span>
        )}
      </div>

      {/* Bottom info bar (like screenshot) */}
      <div className="bg-white px-4 py-3">
        {/* category */}
        {categoryText ? (
          <p className="text-sm font-medium text-orange-500 lowercase leading-none">
            {categoryText}
          </p>
        ) : (
          // keep spacing consistent even if no category
          <div className="h-[14px]" />
        )}

        {/* price */}
        <div className="mt-1 flex items-center justify-between">
          <p className="text-base font-bold text-gray-900">{formattedPrice}</p>

          {/* subtle arrow/indicator (makes it feel clickable like marketplace cards) */}
          <span
            className="
              text-gray-400
              text-sm
              opacity-0
              group-hover:opacity-100
              transition-opacity
            "
          >
            →
          </span>
        </div>
      </div>
    </div>
  );
}
