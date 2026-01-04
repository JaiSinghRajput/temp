'use client';

import { useState } from 'react';

interface CategorySidebarProps {
  categories: any[];
  activeCategory?: string;
  activeSubcategory?: string;
  onSelect: (category?: string, subcategory?: string) => void;
  className?: string;
}

export function CategorySidebar({
  categories,
  activeCategory,
  activeSubcategory,
  onSelect,
  className,
}: CategorySidebarProps) {
  const [hoveredCategory, setHoveredCategory] = useState<any | null>(null);

  return (
    <aside className={`relative w-64 shrink-0 z-30 ${className || ''}`}>
      <div className="sticky top-24 border border-b-0 border-r-0 drop-shadow-sm overflow-visible">
        {/* Header */}
        <div className="px-5 py-4 border-b">
          <h3 className="text-sm font-semibold text-gray-900">Categories</h3>
        </div>

        {/* Category list */}
        <ul className="py-2">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.slug;

            return (
              <li
                key={cat.id}
                onMouseEnter={() => setHoveredCategory(cat)}
                onMouseLeave={() => setHoveredCategory(null)}
                className="relative"
              >
                <button
                  onClick={() => onSelect(cat.slug)}
                  className={`w-full text-left px-5 py-2.5 text-sm flex items-center justify-between transition
                    ${isActive
                      ? 'text-[#d18b47] font-semibold bg-[#d18b47]/10'
                      : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {cat.name}
                  {cat.subcategories?.length > 0 && (
                    <span className="text-gray-400">›</span>
                  )}
                </button>
                {hoveredCategory?.id === cat.id &&
                  cat.subcategories?.length > 0 && (
                    <div
                      className="
    absolute top-0 left-full translate-x-1
    w-64
    bg-[#fcfcfb]
    border border-gray-200
    rounded-lg
    shadow-[0_8px_30px_rgba(0,0,0,0.08)]
    z-50
  "
                      onMouseEnter={() => setHoveredCategory(cat)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    >
                      <div className="absolute -left-3 top-0 h-full w-3" />
                      {/* Subcategory header */}
                      <div className="px-4 py-3 border-b bg-white/60 rounded-t-lg">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {cat.name}
                        </p>
                      </div>

                      {/* Subcategory list */}
                      <ul className="">
                        {cat.subcategories.map((sub: any) => {
                          const isSubActive = activeSubcategory === sub.slug;

                          return (
                            <li key={sub.id}>
                              <button
                                onClick={() => onSelect(cat.slug, sub.slug)}
                                className={`
                  group w-full text-left px-4 py-2 text-sm flex items-center gap-2
                  transition-all
                  ${isSubActive
                                    ? 'bg-[#d18b47]/10 text-[#d18b47] font-semibold'
                                    : 'text-gray-700 hover:bg-gray-100'
                                  }
                `}
                              >
                                {/* Left indicator */}
                                <span
                                  className={`
                    h-1.5 w-1.5 rounded-full
                    ${isSubActive
                                      ? 'bg-[#d18b47]'
                                      : 'bg-gray-300 group-hover:bg-gray-400'
                                    }
                  `}
                                />
                                {sub.name}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
