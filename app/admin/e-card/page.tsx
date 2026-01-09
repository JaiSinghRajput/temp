'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Template } from '@/lib/types';
import { AdminTemplateCard } from '@/components/admin/admin-template-card';
import { AdminHeader } from '@/components/admin/admin-header';

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const result = await response.json();
      if (result.success) setTemplates(result.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = (templateId: number) => {
    router.push(`/admin/e-card/edit/${templateId}`);
  };

  const handleEditTemplate = (templateId: number) => {
    router.push(`/admin/e-card/edit/${templateId}`);
  };

  const handleCreateNew = () => {
    router.push('/admin/e-card/add');
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Delete this template permanently?')) return;

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        setTemplates(prev => prev.filter(t => t.id !== templateId));
      } else {
        alert('Failed to delete template');
      }
    } catch (error) {
      console.error(error);
      alert('Error deleting template');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf7f3]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#d18b47] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading templates…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f3]">
      <AdminHeader
        title="Manage Templates"
        subtitle="Create and manage e-card templates for your shop"
      />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {templates.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-20 text-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              No templates yet
            </h2>
            <p className="text-gray-500 mb-8">
              Start by creating your first e-card template
            </p>

            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 bg-[#d18b47] hover:bg-[#c07c3c] text-white px-8 py-3 rounded-xl font-semibold shadow-md transition"
            >
              + Create Template
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-6">
              <button
                onClick={handleCreateNew}
                className="bg-[#d18b47] hover:bg-[#c07c3c] text-white px-6 py-2.5 rounded-lg font-semibold shadow-sm transition"
              >
                + New Template
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(template => (
                <AdminTemplateCard
                  key={template.id}
                  template={template}
                  onEdit={handleEditTemplate}
                  onDelete={handleDeleteTemplate}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
