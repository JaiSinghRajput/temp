"use client";
import React from 'react';

interface CategoryFormProps {
  name: string;
  description: string;
  submitting?: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CategoryForm({
  name,
  description,
  submitting = false,
  onNameChange,
  onDescriptionChange,
  onSubmit,
}: CategoryFormProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">✨ Add New Category</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Category Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., Holidays, Birthdays"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Brief description..."
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition"
        >
          {submitting ? 'Creating...' : '+ Add Category'}
        </button>
      </form>
    </div>
  );
}
