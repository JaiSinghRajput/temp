'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Template } from '@/lib/types';
import { TemplateCard } from '@/components/templates/template-card';

export default function TemplatesPage() {
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
    router.push(`/templates/edit/${templateId}`);
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
      {/* Templates Grid */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {templates.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">No Templates Available</h2>
            <p className="text-gray-500 mb-6">
              Check back soon for new templates
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={handleTemplateClick}
                primaryLabel="Customize →"
                onPrimary={handleTemplateClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
