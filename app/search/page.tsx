'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import { slugify } from '@/lib/utils';
import { Template, VideoInviteTemplate } from '@/lib/types';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [videoTemplates, setVideoTemplates] = useState<VideoInviteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const [cardsRes, videosRes] = await Promise.all([
          fetch('/api/e-cards'),
          fetch('/api/e-video/templates'),
        ]);

        const cardsJson = await cardsRes.json();
        const videosJson = await videosRes.json();

        if (cardsJson.success && Array.isArray(cardsJson.data)) {
          setTemplates(cardsJson.data);
        }
        if (videosJson.success && Array.isArray(videosJson.data)) {
          setVideoTemplates(videosJson.data as VideoInviteTemplate[]);
        }
      } catch (err) {
        console.error('Search fetch failed', err);
        setError('Failed to load search results');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCards = useMemo(() => {
    if (!normalizedQuery) return templates;
    return templates.filter((t) => {
      const haystack = [
        t.title,
        t.description,
        (t as any).category_name,
        (t as any).subcategory_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, templates]);

  const filteredVideos = useMemo(() => {
    if (!normalizedQuery) return videoTemplates;
    return videoTemplates.filter((v) => {
      const haystack = [v.title, v.description, (v as any).category_name, (v as any).subcategory_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, videoTemplates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = query.trim();
    const params = new URLSearchParams();
    if (next) params.set('q', next);
    router.replace(`/search${next ? `?${params.toString()}` : ''}`);
  };

  return (
    <main className="min-h-screen bg-[#f7f4ef]">
      <PageHeader title="Search" breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Search' }]} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cards and videos"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#d18b47] focus:ring-2 focus:ring-[#d18b47]/30 outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#d18b47] text-white text-sm font-semibold hover:bg-[#c07c3c]"
          >
            Search
          </button>
        </form>

        {loading ? (
          <div className="text-center text-gray-600">Loading results…</div>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : (
          <div className="space-y-10">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">E-Cards</h2>
                <span className="text-sm text-gray-600">{filteredCards.length} found</span>
              </div>

              {filteredCards.length === 0 ? (
                <div className="bg-white border rounded-xl p-6 text-center text-gray-600">No cards match your search.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCards.map((t) => {
                    const cardSlug = (t as any).slug || slugify(t.title || '');
                    const categorySlug = (t as any).category_slug || slugify((t as any).category_name || '') || undefined;
                    const subcategorySlug = (t as any).subcategory_slug || slugify((t as any).subcategory_name || '') || undefined;
                    let href = `/e-card/${cardSlug}`;
                    if (categorySlug && subcategorySlug) href = `/e-card/${categorySlug}/${subcategorySlug}/${cardSlug}`;
                    else if (categorySlug) href = `/e-card/${categorySlug}/${cardSlug}`;

                    return (
                      <Link key={t.id} href={href} className="bg-white border rounded-xl p-4 hover:border-[#d18b47] transition">
                        <div className="text-sm font-semibold text-gray-900 line-clamp-2">{t.title}</div>
                        {(t as any).category_name && (
                          <div className="text-xs text-gray-600 mt-1">{(t as any).category_name}</div>
                        )}
                        {t.description && <p className="text-xs text-gray-500 mt-2 line-clamp-3">{t.description}</p>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">E-Videos</h2>
                <span className="text-sm text-gray-600">{filteredVideos.length} found</span>
              </div>

              {filteredVideos.length === 0 ? (
                <div className="bg-white border rounded-xl p-6 text-center text-gray-600">No videos match your search.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVideos.map((v) => (
                    <Link key={v.id} href={`/e-video/${v.slug}`} className="bg-white border rounded-xl p-4 hover:border-[#d18b47] transition">
                      <div className="text-sm font-semibold text-gray-900 line-clamp-2">{v.title}</div>
                      {(v as any).category_name && (
                        <div className="text-xs text-gray-600 mt-1">{(v as any).category_name}</div>
                      )}
                      {v.description && <p className="text-xs text-gray-500 mt-2 line-clamp-3">{v.description}</p>}
                      {typeof (v as any).price !== 'undefined' && (v as any).price !== null && (
                        <div className="text-xs font-semibold text-gray-800 mt-2">₹{(v as any).price}</div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
