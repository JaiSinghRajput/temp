"use client";
import React from 'react';

interface Font {
  id: number;
  font_name: string;
  cdn_link: string;
}

interface FontListProps {
  fonts: Font[];
  onDelete: (id: number) => void;
}

export function FontList({ fonts, onDelete }: FontListProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Font CDN Links ({fonts.length})</h2>
      {fonts.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No fonts added yet. Add one to get started.</p>
      ) : (
        <div className="space-y-3">
          {fonts.map((font) => (
            <div key={font.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <div className="flex justify-between items-start gap-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-900">{font.font_name}</h3>
                  <a
                    href={font.cdn_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {font.cdn_link}
                  </a>
                  <p className="text-xs text-gray-400">ID: {font.id}</p>
                </div>
                <button
                  onClick={() => onDelete(font.id)}
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
