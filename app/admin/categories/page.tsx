"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryForm } from '@/components/admin/category-form';
import { CategoryList } from '@/components/admin/category-list';
import { AdminHeader } from '@/components/admin/admin-header';

interface Category {
  id: number;
  name: string;
  description?: string | null;
  status: number;
  created_at: string;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const json = await res.json();
      if (json.success) setCategories(json.data);
    } catch (e) {
      console.error('Failed to load categories', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryName.trim(),
          description: categoryDesc.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCategoryName('');
        setCategoryDesc('');
        alert('Category created successfully!');
        fetchCategories();
      } else {
        alert('Error: ' + (json.error || 'Failed to create category'));
      }
    } catch (e) {
      console.error('Error creating category', e);
      alert('Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Delete this category? Associated subcategories will also be deleted.')) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        alert('Category deleted successfully');
        fetchCategories();
      } else {
        alert('Error: ' + (json.error || 'Failed to delete category'));
      }
    } catch (e) {
      console.error('Error deleting category', e);
      alert('Failed to delete category');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50">
      <AdminHeader
        title="Categories"
        subtitle="Manage your e-card template categories"
        containerClass="max-w-6xl"
      />

      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <CategoryForm
          name={categoryName}
          description={categoryDesc}
          submitting={isSubmitting}
          onNameChange={setCategoryName}
          onDescriptionChange={setCategoryDesc}
          onSubmit={handleAddCategory}
        />

        <div className="lg:col-span-2">
          <CategoryList categories={categories} onDelete={handleDeleteCategory} />
        </div>
      </div>
    </div>
  );
}
