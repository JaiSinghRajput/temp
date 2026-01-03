'use client';
import HeroSection from '@/components/Home/Hero';
import SmoothCarousel from '@/components/ui/SmoothCarousel';
import { useAuth } from '@/contexts/AuthContext';
import { Template } from '@/lib/types';
import { templateService, videoService } from '@/services';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface VideoTemplate {
  id: number;
  title: string;
  slug: string;
  description?: string;
  preview_video_url: string;
  preview_thumbnail_url?: string;
  category_id?: number;
  is_active: boolean;
}

export default function Home() {
  const { user, loading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [videoTemplates, setVideoTemplates] = useState<VideoTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        // Fetch e-cards
        const result = await templateService.getTemplates();
        if (result.success && Array.isArray(result.data)) {
          setTemplates(result.data);
        }
        
        // Fetch e-videos
        const videoResult = await videoService.getVideoTemplates();
        if (videoResult.success && Array.isArray(videoResult.data)) {
          setVideoTemplates(videoResult.data);
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
        link: `/e-card/customize/${t.id}`,
      }))
      .filter((item) => item.image);
  }, [templates]);

  const videoCarouselItems = useMemo(() => {
    return videoTemplates
      .map((v) => ({
        id: v.id,
        image: v.preview_thumbnail_url || '',
        title: v.title,
        link: `/e-video/${v.slug}`,
      }))
      .filter((item) => item.image || item.title);
  }, [videoTemplates]);

  if (loading || templatesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-[#faf7f4] via-[#fdfaf7] to-[#f3e4d6]">
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
              title="Best E-Cards"
            />
          </section>
        )}

        {videoCarouselItems.length > 0 && (
          <section>
            <SmoothCarousel
              items={videoCarouselItems}
              visibleItems={5}
              title="Video Invitations"
            />
          </section>
        )}
      </div>
    </main>
  );
}