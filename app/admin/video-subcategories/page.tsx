"use client";

import { useEffect, useMemo, useState } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { VideoCategory, VideoSubcategory } from '@/lib/types';
import { slugify } from '@/lib/utils';

export default function VideoSubcategoriesPage() {
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [subs, setSubs] = useState<VideoSubcategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchSubs();
  }, []);

  const fetchCategories = async () => {
    const res = await fetch('/api/video-categories');
    const json = await res.json();
    if (json.success) setCategories(json.data || []);
  };

  const fetchSubs = async (categoryId?: number | null) => {
    setLoading(true);
    try {
      const url = categoryId ? `/api/video-subcategories?category_id=${categoryId}` : '/api/video-subcategories';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setSubs(json.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/video-subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: selectedCat,
          name: name.trim(),
          slug: slug.trim() || slugify(name),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setName('');
        setSlug('');
        setShowModal(false);
        fetchSubs(selectedCat);
      } else {
        alert(json.error || 'Failed to create subcategory');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this subcategory?')) return;
    const res = await fetch(`/api/video-subcategories/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) fetchSubs(selectedCat);
  };

  const currentSubs = useMemo(() => {
    if (!selectedCat) return subs;
    return subs.filter((s) => s.category_id === selectedCat);
  }, [subs, selectedCat]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Video Subcategories" subtitle="Organize video invite subcategories" />

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Filter by category</label>
            <select
              value={selectedCat || ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                setSelectedCat(val);
                fetchSubs(val);
              }}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold"
          >
            Add Subcategory
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-500 text-sm">Loading…</div>
        ) : (
          <div className="border rounded-md overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Slug</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentSubs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500">No subcategories found</td>
                  </tr>
                )}
                {currentSubs.map((sub) => {
                  const catName = categories.find((c) => c.id === sub.category_id)?.name || '—';
                  return (
                    <tr key={sub.id} className="border-t">
                      <td className="p-3 font-medium text-gray-900">{sub.name}</td>
                      <td className="p-3 text-gray-500">{sub.slug}</td>
                      <td className="p-3 text-gray-600">{catName}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Add Video Subcategory</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Category</label>
                <select
                  value={selectedCat || ''}
                  onChange={(e) => setSelectedCat(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border px-3 py-2 rounded"
                  required
                >
                  <option value="">-- Select --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Slug (optional)</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                  placeholder="auto-generated from name"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || !selectedCat} className="px-4 py-2 bg-primary text-white rounded">
                  {submitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
