'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axiosInstance from '@/lib/axios';
import VideoEditor from '../../_components/VideoEditor';

export default function EditEVideoPage() {
  const routeParams = useParams<{ id: string }>();
  const id = routeParams?.id?.toString() || '';
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideoTemplate = async () => {
      try {
        const result = await axiosInstance.get(`/api/e-video/templates/${id}?includeInactive=1`);
        const payload = result?.data;
        if (payload?.success && payload?.data) {
          setTemplate(payload.data);
        } else if (payload?.data) {
          setTemplate(payload.data);
        } else {
          setError(payload?.error || payload?.message || 'Template not found');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load template');
      } finally {
        setLoading(false);
      }
    };

    fetchVideoTemplate();
  }, [id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!template) return <div className="p-6">Template not found</div>;

  return (
    <VideoEditor
      mode="edit"
      initialData={template}
      templateId={id}
      onCancel={() => window.history.back()}
    />
  );
}
