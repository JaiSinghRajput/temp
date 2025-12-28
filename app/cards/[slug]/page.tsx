'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

interface UserCard {
  id: number;
  template_id: number;
  user_name?: string | null;
  preview_url: string;
  created_at?: string;
}

export default function ShareableCard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [card, setCard] = useState<UserCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const link = document.createElement('a');
    link.href = card.preview_url;
    link.download = `ecard-${slug}.png`;
    link.click();
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
          <button onClick={() => router.push('/templates')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Browse Templates</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">Your E-Card</h1>
        </div>
        <div className="w-full bg-gray-100 rounded-xl border border-gray-200 overflow-hidden">
          <img src={card.preview_url} alt="E-Card Preview" className="w-full h-auto object-contain" />
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={copyLink} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">Copy Link</button>
          <button onClick={downloadImage} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Download</button>
          <button onClick={() => router.push('/templates')} className="px-4 py-2 bg-gray-100 rounded-lg">Create Another</button>
        </div>
      </div>
    </div>
  );
}
