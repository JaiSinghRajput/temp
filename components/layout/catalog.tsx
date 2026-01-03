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
      <div className="sticky top-24 bg-white border shadow-sm overflow-visible">
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
                    ${
                      isActive
                        ? 'text-[#d18b47] font-semibold bg-[#d18b47]/10'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {cat.name}
                  {cat.subcategories?.length > 0 && (
                    <span className="text-gray-400">›</span>
                  )}
                </button>

                {/* 👉 SUBCATEGORY FLYOUT */}
                {hoveredCategory?.id === cat.id &&
                  cat.subcategories?.length > 0 && (
                    <div
                      className="absolute top-0 left-full w-60 bg-white border rounded-xss shadow-lg z-50"
                      onMouseEnter={() => setHoveredCategory(cat)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      style={{ marginLeft: '4px' }}
                    >
                      <div className="py-1">
                        {cat.subcategories.map((sub: any) => {
                          const isSubActive = activeSubcategory === sub.slug;

                          return (
                            <button
                              key={sub.id}
                              onClick={() =>
                                onSelect(cat.slug, sub.slug)
                              }
                              className={`block w-full text-left px-4 py-1.5 text-sm transition
                                ${
                                  isSubActive
                                    ? 'bg-[#d18b47]/10 text-[#d18b47] font-semibold'
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                              {sub.name}
                            </button>
                          );
                        })}
                      </div>
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
