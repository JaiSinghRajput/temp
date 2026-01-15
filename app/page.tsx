'use client';
import HeroSection from '@/components/Home/Hero';
import SmoothCarousel from '@/components/ui/SmoothCarousel';
import { Template } from '@/lib/types';
import { templateService, videoService } from '@/services';
import { slugify as strSlugify, buildUrl } from '@/lib/utils';
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
  category_slug?: string | null;
  subcategory_slug?: string | null;
  is_active: boolean;
  price?: number;
}
export default function Home() {
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
          t.pages?.[0]?.previewImageUrl ||
          t.thumbnail_url ||
          t.template_image_url ||
          t.pages?.[0]?.imageUrl ||
          '',
        title: t.title,
        link: (() => {
          const cat = (t as any).category_slug || strSlugify((t as any).category_name || '');
          const sub = (t as any).subcategory_slug || strSlugify((t as any).subcategory_name || '');
          const card = (t as any).slug || strSlugify(t.title || '');
          if (cat && sub && card) return `/e-card/${cat}/${sub}/${card}`;
          if (cat && card) return `/e-card/${cat}/${card}`;
          return `/e-card/${card}`;
        })(),
      }))
      .filter((item) => item.image);
  }, [templates]);

  const videoCarouselItems = useMemo(() => {
    return videoTemplates
      .map((v) => ({
        id: v.id,
        image: v.preview_thumbnail_url || '',
        title: v.title,
        link: buildUrl({
          slug: v.slug,
          category_slug: v.category_slug,
          subcategory_slug: v.subcategory_slug,
        }),
        price: (() => {
          if (v.price === null || typeof v.price === 'undefined') return 0;
          const parsed = Number(v.price);
          return Number.isFinite(parsed) ? parsed : 0;
        })(),
      }))
      .filter((item) => item.image || item.title);
  }, [videoTemplates]);

  if (templatesLoading) {
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
                    link={item.link}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </section>
      <section className="py-10 bg-amber-50 w-full">
        {carouselItems.length > 0 && (
          <SmoothCarousel
            items={carouselItems}
            visibleItems={1}
            title="Best E-Cards"
          />
        )}
      </section>
      <EmailBanner />
    </main >
  );
}