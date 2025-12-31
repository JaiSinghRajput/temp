'use client';

import HeroSection from '@/components/Home/Hero';
import SmoothCarousel from '@/components/ui/SmoothCarousel';
import { useAuth } from '@/contexts/AuthContext';
import { Template } from '@/lib/types';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/templates');
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setTemplates(result.data);
        }
      } catch (err) {
        console.error('Failed to load templates', err);
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const carouselItems = useMemo(() => {
    return templates
      .map((t) => ({
        id: t.id,
        image:
          t.thumbnail_uri ||
          t.template_image_url ||
          t.pages?.[0]?.imageUrl ||
          '',
        title: t.name,
        link: `/cards/edit/${t.id}`,
      }))
      .filter((item) => item.image);
  }, [templates]);

  if (loading || templatesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⌛</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <HeroSection />

        {carouselItems.length > 0 && (
          <section>
            <SmoothCarousel
              items={carouselItems}
              visibleItems={5}
              title="Best E-Card"
            />
          </section>
        )}
      </div>
    </main>
  );
}