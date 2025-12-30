'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Template } from '@/lib/types';
import { TemplateCard } from '@/components/templates/template-card';
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
      const response = await fetch('/api/templates');
      const result = await response.json();
      if (result.success) {
        setTemplates(result.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = (templateId: number) => {
    router.push(`/admin/e-card/edit/${templateId}`);
  };

  const handleCreateNew = () => {
    router.push('/admin/e-card/add');
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setTemplates(templates.filter(t => t.id !== templateId));
        alert('Template deleted successfully!');
      } else {
        alert('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50">
      <AdminHeader
        title="Manage Templates"
        subtitle="Create and manage e-card templates for your shop"
      />

      {/* Templates Grid */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {templates.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">No Templates Yet</h2>
            <p className="text-gray-500 mb-6">
              Create your first template to get started
            </p>
            <button
              onClick={handleCreateNew}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition"
            >
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                badgeText="ADMIN"
                onSelect={handleTemplateClick}
                primaryLabel="Edit"
                onPrimary={handleTemplateClick}
                secondaryLabel="Delete"
                onSecondary={handleDeleteTemplate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
