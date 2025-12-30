'use client';

import HeroSection from '@/components/Home/Hero';
import SmoothCarousel from '@/components/ui/SmoothCarousel';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();

  const welcomeCards = [
    {
      id: 1,
      image: "https://shop.dreamweddinghub.com/public/uploads/cards/1766640502_pCI2dP1s2p.webp",
    },
    {
      id: 2,
      image: "https://shop.dreamweddinghub.com/public/uploads/cards/1766640502_pCI2dP1s2p.webp",
    },
    {
      id: 3,
      image: "https://shop.dreamweddinghub.com/public/uploads/cards/1766640502_pCI2dP1s2p.webp",
    },
    {
      id: 4,
      image: "https://shop.dreamweddinghub.com/public/uploads/cards/1766640502_pCI2dP1s2p.webp",
    },
    {
      id: 5,
      image: "https://shop.dreamweddinghub.com/public/uploads/cards/1766640502_pCI2dP1s2p.webp",
    },
  ];


  if (loading) {
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
    <>
      <HeroSection />
      <SmoothCarousel items={welcomeCards} visibleItems={5} title="Best E-Card" />
    </>
  );
}