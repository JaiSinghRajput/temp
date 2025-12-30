"use client";
import React from 'react';

interface Category {
  id: number;
  name: string;
  description?: string | null;
}

interface CategoryListProps {
  categories: Category[];
  onDelete: (id: number) => void;
}

export function CategoryList({ categories, onDelete }: CategoryListProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">All Categories ({categories.length})</h2>
      {categories.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No categories yet. Create one!</p>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">{cat.name}</h3>
                  {cat.description && <p className="text-sm text-gray-600 mt-1">{cat.description}</p>}
                  <p className="text-xs text-gray-400 mt-2">ID: {cat.id}</p>
                </div>
                <button
                  onClick={() => onDelete(cat.id)}
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
