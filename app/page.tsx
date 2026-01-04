'use client';
import HeroSection from '@/components/Home/Hero';
import SmoothCarousel from '@/components/ui/SmoothCarousel';
import { useAuth } from '@/contexts/AuthContext';
import { Template } from '@/lib/types';
import { templateService, videoService } from '@/services';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import VideoCard from '@/components/Home/VideoCard';
import { motion } from 'framer-motion';
import EmailBanner from '@/components/Home/EmailBanner';
interface VideoTemplate {
  id: number;
  title: string;
  slug: string;
  description?: string;
  preview_video_url: string;
  preview_thumbnail_url?: string;
  category_id?: number;
  is_active: boolean;
  price?: number;
}

function slugify(text: string[] | null | undefined): string {
  if (!text) return '';
  return text
    .filter(t => t) // Remove empty strings
    .map(t => t.toString().toLowerCase().replace(/\s+/g, '-'))
    .join('/');
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
        link: `/e-card/${slugify([t.category_name ?? '', t.subcategory_name ?? '', t.name])}`,
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
        price: (() => {
          if (v.price === null || typeof v.price === 'undefined') return 0;
          const parsed = Number(v.price);
          return Number.isFinite(parsed) ? parsed : 0;
        })(),
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
  return (
    <main className="min-h-screen bg-white w-full">
      <HeroSection className="bg-blue-50" />
      <section className='bg-red-50 py-10'>
        {videoCarouselItems.length > 0 && (
          <>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className='text-2xl font-semibold text-center mb-3'
            >
              <span className="border-b-2 border-b-red-300 px-2">Video Invitations</span>
            </motion.h2>
            <section className='w-full'>
              <div className='flex justify-center gap-4'>
                {videoCarouselItems.map((item) => (
                  <VideoCard
                    key={item.id}
                    image={item.image}
                    name={item.title || "Video Invitation"}
                    price={item.price}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </section>
      <section className="py-10 bg-amber-50">
        {carouselItems.length > 0 && (
          <SmoothCarousel
            items={carouselItems}
            visibleItems={5}
            title="Best E-Cards"
          />
        )}
      </section>
      <EmailBanner />
    </main >
  );
}