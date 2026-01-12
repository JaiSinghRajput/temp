"use client";
import { useEffect, useState } from "react";
import { CardcategoryService } from '@/services';

interface Category {
  id: number;
  name: string;
}

interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  slug: string;
}

export default function SubcategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const json = await CardcategoryService.getCardCategories();
    if (json.success && json.data.length) {
      setCategories(json.data);
      setSelectedCategory(json.data[0].id);
      await fetchSubcategories(json.data[0].id);
    }
    setLoading(false);
  };

  const fetchSubcategories = async (categoryId: number) => {
    const json = await CardcategoryService.getCardSubcategories(categoryId);
    if (json.success) setSubcategories(json.data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !name.trim()) return;

    setSubmitting(true);
    const json = await CardcategoryService.createCardSubcategory({
      category_id: selectedCategory,
      name: name.trim(),
      slug: slug.trim() || undefined,
    });
    if (json.success) {
      setName("");
      setSlug("");
      setShowModal(false);
      fetchSubcategories(selectedCategory);
    } else {
      alert(json.error || "Failed to add subcategory");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this subcategory?")) return;
    const json = await CardcategoryService.deleteCardSubcategory(id);
    if (json.success && selectedCategory) {
      fetchSubcategories(selectedCategory);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Subcategories</h1>

        <div className="flex gap-2">
          <select
            value={selectedCategory ?? ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedCategory(id);
              fetchSubcategories(id);
            }}
            className="border px-3 py-2 rounded"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-black text-white rounded"
          >
            Add Subcategory
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Slug</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {subcategories.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">
                  No subcategories found
                </td>
              </tr>
            )}

            {subcategories.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">{s.name}</td>
                <td className="p-3 text-gray-600">{s.slug}</td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => handleDelete(s.id)}
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
              Add Subcategory
            </h2>

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
                <label className="block text-sm mb-1">Slug</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
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
