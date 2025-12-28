'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Template {
  id: number;
  name: string;
  description: string;
  template_image_url: string;
  thumbnail_uri?: string | null;
  created_at: string;
}

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
    router.push(`/admin/editor/${templateId}`);
  };

  const handleCreateNew = () => {
    router.push('/admin/editor');
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, templateId: number) => {
    e.stopPropagation();
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🎨 Admin - Manage Templates
              </h1>
              <p className="text-gray-600 mt-1">
                Create and manage e-card templates for your shop
              </p>
            </div>
            <button
              onClick={handleCreateNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all transform active:scale-95"
            >
              + Create New Template
            </button>
          </div>
        </div>
      </div>

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
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition"
            >
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all overflow-hidden group border border-gray-200"
              >
                {/* Template Preview */}
                <div 
                  className="relative h-64 bg-gray-100 overflow-hidden cursor-pointer"
                  onClick={() => handleTemplateClick(template.id)}
                >
                  { (template.thumbnail_uri || template.template_image_url) ? (
                    <img
                      src={template.thumbnail_uri || template.template_image_url}
                      alt={template.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-6xl">🎴</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                      ADMIN
                    </span>
                  </div>
                </div>

                {/* Template Info */}
                <div className="p-5">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Created {new Date(template.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateClick(template.id);
                        }}
                        className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg text-sm font-semibold transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => handleDeleteTemplate(e, template.id)}
                        className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-semibold transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
