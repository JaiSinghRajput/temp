"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";

const isAdminRole = (role?: string | null) => {
  const r = (role || "").toLowerCase();
  return r === "admin" || r === "super_admin" || r === "editor";
};

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && user && isAdminRole(user.role)) {
      router.replace("/admin");
    }
  }, [user, loading, router]);

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f4ef]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#d18b47] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading profile…</p>
        </div>
      </div>
    );
  }

  /* ---------- Not logged in ---------- */
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f4ef] px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md w-full">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Welcome back
          </h2>
          <p className="text-gray-600 mb-6">
            Please sign in to access your profile.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-lg bg-[#d18b47] text-white font-semibold"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-lg bg-gray-100 text-gray-800 font-semibold"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isAdminRole(user.role)) return null;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = user.name || "Guest User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#f7f4ef]">
      <PageHeader
        title="My Profile"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Profile" },
        ]}
        backgroundImage="/images/login-bg.jpg"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* ---------- Header ---------- */}
          <div className="p-6 sm:p-8 border-b flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Avatar */}
            <div className="h-20 w-20 rounded-full bg-[#d18b47]/10 text-[#d18b47] flex items-center justify-center text-2xl font-bold">
              {initials}
            </div>

            {/* Identity */}
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-900">
                {displayName}
              </h2>
              <p className="text-sm text-gray-600">
                {user.email || "No email provided"}
              </p>

              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 capitalize">
                  {user.role?.replace("_", " ") || "user"}
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
            >
              {isLoggingOut ? "Signing out…" : "Logout"}
            </button>
          </div>

          {/* ---------- Details ---------- */}
          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InfoCard label="Full name" value={user.name} />
            <InfoCard label="Email address" value={user.email} />
            <InfoCard label="Mobile number" value={user.mobile} />
            <InfoCard
              label="Account type"
              value={user.role?.replace("_", " ") || "User"}
            />
          </div>

          {/* ---------- Actions ---------- */}
          <div className="p-6 sm:p-8 border-t flex flex-wrap gap-3">
            <Link
              href="/my-cards"
              className="px-5 py-2.5 rounded-lg bg-[#d18b47] text-white font-semibold"
            >
              My Cards
            </Link>
            <Link
              href="/my-videos"
              className="px-5 py-2.5 rounded-lg bg-[#d18b47] text-white font-semibold"
            >
              My videos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small reusable piece ---------- */
function InfoCard({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-gray-900">
        {value || "Not provided"}
      </p>
    </div>
  );
}
