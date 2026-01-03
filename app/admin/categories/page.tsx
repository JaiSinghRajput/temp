"use client";

import { useEffect, useState } from "react";
import { categoryService } from '@/services';

interface Category {
  id: number;
  name: string;
  description?: string | null;
  status: number;
  created_at: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const json = await categoryService.getCategories();
      if (json.success) setCategories(json.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const json = await categoryService.createCategory({
        name: name.trim(),
        description: description.trim() || null,
      } as any);

      if (json.success) {
        setName("");
        setDescription("");
        setShowModal(false);
        fetchCategories();
      } else {
        alert(json.error || "Failed to create category");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this category?")) return;

    const json = await categoryService.deleteCategory(id);
    if (json.success) fetchCategories();
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Add Category
        </button>
      </div>

      {/* Table */}
      <div className="border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Description</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">
                  No categories found
                </td>
              </tr>
            )}

            {categories.map((cat) => (
              <tr key={cat.id} className="border-t">
                <td className="p-3">{cat.name}</td>
                <td className="p-3 text-gray-600">
                  {cat.description || "-"}
                </td>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Add Category
            </h2>

            <form onSubmit={handleAddCategory} className="space-y-4">
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
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-black text-white rounded"
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
