"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserEcard } from '@/lib/types';

export default function MyCardsPage() {
  const { user, loading } = useAuth();
  const [cards, setCards] = useState<UserEcard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCards([]);
      setCardsLoading(false);
      return;
    }

    const fetchCards = async () => {
      try {
        const res = await fetch(`/api/user-ecards?user_id=${user.id}`);
        const result = await res.json();
        if (result.success) {
          setCards(result.data || []);
        }
      } catch (err) {
        console.error('Failed to load user cards', err);
      } finally {
        setCardsLoading(false);
      }
    };

    fetchCards();
  }, [user]);

  if (loading || cardsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your cards...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white shadow-lg rounded-2xl p-8 text-center max-w-md w-full">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Sign in to view your cards</h2>
          <p className="text-gray-600 mb-6">Log in to see all cards you have published.</p>
          <div className="flex justify-center gap-3">
            <Link href="/login" className="px-4 py-2 rounded-lg bg-primary text-white font-semibold">Login</Link>
            <Link href="/register" className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold">Register</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Published Cards</h1>
            <p className="text-sm text-gray-600">Cards you have customized and published.</p>
          </div>
          <Link href="/cards" className="text-primary font-semibold hover:underline">Create New</Link>
        </div>

        {cards.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-500">
            You have not published any cards yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map((card) => {
              const preview = Array.isArray(card.preview_urls) && card.preview_urls.length > 0
                ? card.preview_urls[0]
                : card.preview_url;

              return (
                <div key={card.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center">
                    {preview ? (
                      <img src={preview} alt="Card preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400 text-sm">No preview</span>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="text-sm text-gray-500">Published on {card.created_at ? new Date(card.created_at).toLocaleDateString() : '—'}</p>
                    <div className="flex gap-2">
                      {card.public_slug && (
                        <Link
                          href={`/cards/${card.public_slug}`}
                          className="flex-1 text-center px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
                        >
                          View
                        </Link>
                      )}
                      {card.preview_url && (
                        <a
                          href={preview || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center px-3 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-semibold"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
