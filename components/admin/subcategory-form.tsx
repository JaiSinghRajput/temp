"use client";
import React from 'react';

interface CategoryOption {
  id: number;
  name: string;
}

interface SubcategoryFormProps {
  categories: CategoryOption[];
  selectedCategory: number | null;
  name: string;
  slug: string;
  submitting?: boolean;
  onCategoryChange: (id: number) => void;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function SubcategoryForm({
  categories,
  selectedCategory,
  name,
  slug,
  submitting = false,
  onCategoryChange,
  onNameChange,
  onSlugChange,
  onSubmit,
}: SubcategoryFormProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">✨ Add New Subcategory</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
          <select
            value={selectedCategory || ''}
            onChange={(e) => onCategoryChange(parseInt(e.target.value, 10))}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">-- Select Category --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Subcategory Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., Birthday Wishes"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Slug (optional)</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="auto-generated from name"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !selectedCategory}
          className="w-full bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition"
        >
          {submitting ? 'Creating...' : '+ Add Subcategory'}
        </button>
      </form>
    </div>
  );
}
