'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NavbarDropdown, { DropdownItem } from '@/components/ui/ECardDropdown';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShoppingCartCheckout,
  Search,
  Menu,
  Close,
} from '@mui/icons-material';

const Navbar: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.refresh();
    } finally {
      setIsLoggingOut(false);
      setMenuOpen(false);
    }
  };

  const eCardMenu: DropdownItem[] = [
    { label: 'Wedding Card', href: '/e-card/wedding-card' },
    { label: 'Invitation Card', href: '/e-card/invitation-card' },
    { label: 'Wedding Itinerary', href: '/e-card/wedding-itinerary' },
    { label: 'Welcome Note', href: '/e-card/welcome-note' },
    { label: 'Thank Note', href: '/e-card/thank-note' },
    { label: 'Luggage Tag', href: '/e-card/luggage-tag' },
  ];

  return (
    <header className="w-full border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm" suppressHydrationWarning>
      {/* ================= MOBILE NAV ================= */}
      <div className="md:hidden">
        <div className="h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)}>
              <Menu />
            </button>

            <Link href="/">
              <img
                src="/logo.png"
                alt="Dream Wedding Hub"
                className="h-9"
              />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/search">
              <Search />
            </Link>

            <Link href="/cart" className="relative">
              <ShoppingCartCheckout />
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[#d18b47] text-white text-xs flex items-center justify-center">
                0
              </span>
            </Link>
          </div>
        </div>

        {/* Drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 bg-black/40">
            <div className="absolute left-0 top-0 h-full w-72 bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <img src="/logo.png" className="h-10" />
                <button onClick={() => setMenuOpen(false)}>
                  <Close />
                </button>
              </div>

              <nav className="flex flex-col gap-4 text-sm font-medium">
                {eCardMenu.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}

                <Link href="/e-videos" onClick={() => setMenuOpen(false)}>
                  E-Video
                </Link>
              </nav>

              <div className="mt-8 border-t pt-4">
                {!loading && user ? (
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 text-sm font-semibold"
                  >
                    {isLoggingOut ? 'Logging out…' : 'Logout'}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="block w-full px-4 py-2 rounded-lg bg-[#d18b47] text-white text-center font-semibold"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= DESKTOP NAV (UNCHANGED) ================= */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <img
              src="/logo.png"
              alt="Dream Wedding Hub"
              className="h-12 w-auto object-contain cursor-pointer"
            />
          </Link>

          {/* Center Menu */}
          <nav className="flex items-center gap-8 text-sm font-medium text-gray-700 tracking-wide">
            <NavbarDropdown label="E-Card" items={eCardMenu} />
            <Link
              href="/e-videos"
              className="hover:text-[#d18b47] transition uppercase"
            >
              E-Video
            </Link>
          </nav>

          {/* Right Icons */}
          <div className="flex items-center gap-4">
            <Link href="/search">
              <Search />
            </Link>

            {!loading && user ? (
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            ) : (
              <Link href="/login">User</Link>
            )}

            <div className="relative">
              <Link href="/cart">
                <ShoppingCartCheckout />
              </Link>
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[#d18b47] text-white text-xs flex items-center justify-center">
                0
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
