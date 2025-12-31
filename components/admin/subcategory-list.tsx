"use client";
import React from 'react';

interface Subcategory {
  id: number;
  name: string;
  slug: string;
}

interface SubcategoryListProps {
  subcategories: Subcategory[];
  categoryName?: string;
  onDelete: (id: number) => void;
}

export function SubcategoryList({ subcategories, categoryName, onDelete }: SubcategoryListProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Subcategories {categoryName ? `for "${categoryName}"` : ''}
      </h2>
      {subcategories.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No subcategories yet. Create one!</p>
      ) : (
        <div className="space-y-3">
          {subcategories.map((subcat) => (
            <div key={subcat.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">{subcat.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">Slug: <code className="bg-gray-100 px-2 py-1 rounded">{subcat.slug}</code></p>
                  <p className="text-xs text-gray-400 mt-2">ID: {subcat.id}</p>
                </div>
                <button
                  onClick={() => onDelete(subcat.id)}
                  className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition text-sm font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
