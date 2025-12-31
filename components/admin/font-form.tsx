"use client";
import React from 'react';

interface FontFormProps {
  fontName: string;
  cdnLink: string;
  submitting?: boolean;
  onFontNameChange: (value: string) => void;
  onCdnLinkChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function FontForm({
  fontName,
  cdnLink,
  submitting = false,
  onFontNameChange,
  onCdnLinkChange,
  onSubmit,
}: FontFormProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">🅰️ Add Font CDN</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Font name *</label>
          <input
            type="text"
            value={fontName}
            onChange={(e) => onFontNameChange(e.target.value)}
            placeholder="e.g., Montserrat"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">CDN stylesheet URL *</label>
          <input
            type="url"
            value={cdnLink}
            onChange={(e) => onCdnLinkChange(e.target.value)}
            placeholder="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Provide a CSS URL that defines the font (e.g., Google Fonts stylesheet).</p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition"
        >
          {submitting ? 'Saving...' : '+ Add Font'}
        </button>
      </form>
    </div>
  );
}
