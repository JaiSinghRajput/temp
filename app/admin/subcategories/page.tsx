"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubcategoryForm } from '@/components/admin/subcategory-form';
import { SubcategoryList } from '@/components/admin/subcategory-list';
import { AdminHeader } from '@/components/admin/admin-header';

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
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [subcategoryName, setSubcategoryName] = useState('');
  const [subcategorySlug, setSubcategorySlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const init = async () => {
      await fetchCategories();
      setLoading(false);
    };
    init();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const json = await res.json();
      if (json.success) {
        setCategories(json.data);
        if (json.data.length > 0) {
          const firstId = json.data[0].id;
          setSelectedCategory(firstId);
          await fetchSubcategories(firstId);
        }
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  };

  const fetchSubcategories = async (categoryId: number) => {
    try {
      const res = await fetch(`/api/subcategories?category_id=${categoryId}`);
      const json = await res.json();
      if (json.success) setSubcategories(json.data);
    } catch (e) {
      console.error('Failed to load subcategories', e);
    }
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !subcategoryName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: selectedCategory,
          name: subcategoryName.trim(),
          slug: subcategorySlug.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSubcategoryName('');
        setSubcategorySlug('');
        alert('Subcategory created successfully!');
        await fetchSubcategories(selectedCategory);
      } else {
        alert('Error: ' + (json.error || 'Failed to create subcategory'));
      }
    } catch (e) {
      console.error('Error creating subcategory', e);
      alert('Failed to create subcategory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async (id: number) => {
    if (!confirm('Delete this subcategory?')) return;

    try {
      const res = await fetch(`/api/subcategories/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        alert('Subcategory deleted successfully');
        if (selectedCategory) await fetchSubcategories(selectedCategory);
      } else {
        alert('Error: ' + (json.error || 'Failed to delete subcategory'));
      }
    } catch (e) {
      console.error('Error deleting subcategory', e);
      alert('Failed to delete subcategory');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50">
      <AdminHeader
        title="📋 Subcategories"
        subtitle="Manage subcategories by category"
        containerClass="max-w-6xl"
        actions={[
          { label: '← Dashboard', href: '/admin', variant: 'ghost' },
          { label: 'Categories', href: '/admin/categories', variant: 'ghost' },
        ]}
      />

      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <SubcategoryForm
          categories={categories}
          selectedCategory={selectedCategory}
          name={subcategoryName}
          slug={subcategorySlug}
          submitting={isSubmitting}
          onCategoryChange={async (id) => {
            setSelectedCategory(id);
            await fetchSubcategories(id);
          }}
          onNameChange={setSubcategoryName}
          onSlugChange={setSubcategorySlug}
          onSubmit={handleAddSubcategory}
        />

        <div className="lg:col-span-2">
          <SubcategoryList
            subcategories={subcategories}
            categoryName={selectedCategory ? categories.find((c) => c.id === selectedCategory)?.name : undefined}
            onDelete={handleDeleteSubcategory}
          />
        </div>
      </div>
    </div>
  );
}
