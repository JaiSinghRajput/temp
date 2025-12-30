'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

interface UserCard {
  id: number;
  template_id: number;
  user_name?: string | null;
  preview_url: string;
  preview_urls?: string[]; // Multi-page support
  created_at?: string;
}

export default function ShareableCard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [card, setCard] = useState<UserCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const previews = card?.preview_urls && card.preview_urls.length > 0
    ? card.preview_urls
    : card?.preview_url
    ? [card.preview_url]
    : [];

  const hasMultiplePages = previews.length > 1;

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const res = await fetch(`/api/user-ecards/${slug}`);
        const result = await res.json();
        if (result.success) {
          setCard(result.data);
        } else {
          setError(result.error || 'Card not found');
        }
      } catch (e) {
        console.error('Failed to load card', e);
        setError('Failed to load card');
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [slug]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    } catch {
      alert('Failed to copy link');
    }
  };

  const downloadImage = () => {
    if (!card) return;
    const currentPreview = previews[currentPageIndex];
    if (!currentPreview) return;
    
    const link = document.createElement('a');
    link.href = currentPreview;
    link.download = `ecard-${slug}${hasMultiplePages ? `-page-${currentPageIndex + 1}` : ''}.png`;
    link.click();
  };

  const downloadAllPages = () => {
    if (!card || !hasMultiplePages) return;
    
    previews.forEach((url, idx) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `ecard-${slug}-page-${idx + 1}.png`;
        link.click();
      }, idx * 500); // Stagger downloads
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-gray-600">{error || 'Card not found'}</p>
          <button onClick={() => router.push('/templates')} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">Browse Templates</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-r from-blue-50 to-purple-50 py-12">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">Your E-Card</h1>
          {hasMultiplePages && (
            <span className="text-sm text-gray-600">
              Page {currentPageIndex + 1} of {previews.length}
            </span>
          )}
        </div>

        <div className="w-full bg-gray-100 rounded-xl border border-gray-200 overflow-hidden flex justify-center">
          <img
            src={previews[currentPageIndex]}
            alt={`E-Card Preview - Page ${currentPageIndex + 1}`}
            className="w-full max-w-full max-h-[80vh] object-contain object-center"
          />
        </div>

        {/* Page Navigation */}
        {hasMultiplePages && (
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
              disabled={currentPageIndex === 0}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            
            <div className="flex gap-2">
              {previews.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPageIndex(idx)}
                  className={`w-3 h-3 rounded-full transition ${
                    idx === currentPageIndex ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  aria-label={`Go to page ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrentPageIndex(Math.min(previews.length - 1, currentPageIndex + 1))}
              disabled={currentPageIndex === previews.length - 1}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}

        <div className="mt-6 flex gap-3 flex-wrap">
          <button onClick={copyLink} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            Copy Link
          </button>
          <button onClick={downloadImage} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Download {hasMultiplePages ? 'Current Page' : 'Image'}
          </button>
          {hasMultiplePages && (
            <button onClick={downloadAllPages} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Download All Pages
            </button>
          )}
          <button onClick={() => router.push('/templates')} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            Create Another
          </button>
        </div>
      </div>
    </div>
  );
}
