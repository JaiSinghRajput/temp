"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavbarDropdown, { DropdownItem } from "@/components/ui/ECardDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { ShoppingCartCheckout,Search } from "@mui/icons-material";

const Navbar: React.FC = () => {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const isAdmin = useMemo(() => user?.role === 'admin' || user?.role === 'super_admin', [user]);

    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);
            await logout();
            router.refresh();
        } finally {
            setIsLoggingOut(false);
        }
    };

    const eCardMenu: DropdownItem[] = [
        { label: "Wedding Card", href: "/e-card/wedding-card" },
        { label: "Invitation Card", href: "/e-card/invitation-card" },
        { label: "Wedding Itinerary", href: "/e-card/wedding-itinerary" },
        { label: "Welcome Note", href: "/e-card/welcome-note" },
        { label: "Thank Note", href: "/e-card/thank-note" },
        { label: "Luggage Tag", href: "/e-card/luggage-tag" },
    ];

    return (
        <header className="w-full border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
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
                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700 tracking-wide">
                    <NavbarDropdown label="E-Card" items={eCardMenu} />
                    <Link href="/e-videos" className="hover:text-[#d18b47] transition uppercase">
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
                            type="button"
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-60 cursor-pointer"
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
        </header>
    );
};

export default Navbar;
