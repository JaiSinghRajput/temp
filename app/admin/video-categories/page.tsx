"use client";

import { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { VideoCategory } from '@/lib/types';

export default function VideoCategoriesPage() {
  const [items, setItems] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/video-categories');
      const json = await res.json();
      if (json.success) setItems(json.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/video-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      const json = await res.json();
      if (json.success) {
        setName('');
        setDescription('');
        setShowModal(false);
        fetchItems();
      } else {
        alert(json.error || 'Failed to create category');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    const res = await fetch(`/api/video-categories/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) fetchItems();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title="Video Categories" subtitle="Manage video invite categories" />

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold"
          >
            Add Category
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
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500">
                      No categories found
                    </td>
                  </tr>
                )}
                {items.map((cat) => (
                  <tr key={cat.id} className="border-t">
                    <td className="p-3 font-medium text-gray-900">{cat.name}</td>
                    <td className="p-3 text-gray-500">{cat.slug}</td>
                    <td className="p-3 text-gray-600">{cat.description || '—'}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Add Video Category</h3>
            <form onSubmit={handleAdd} className="space-y-4">
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
                <label className="block text-sm mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary text-white rounded">
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
