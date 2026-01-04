"use client";

import { useMemo } from "react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import VideoRequestWizard from "./_components/VideoRequestWizard";
import VideoCatalog from "./_components/VideoCatalog";
import VideoDetail from "./_components/VideoDetail";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function EVideosPage() {
  const params = useParams<{ slug?: string[] }>();
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPath = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  const loginHref = `/login?next=${encodeURIComponent(currentPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(currentPath)}`;

  const slugParts = Array.isArray(params.slug)
    ? params.slug
    : typeof params.slug === "string"
    ? [params.slug]
    : [];

  const isRequest =
    slugParts.length >= 4 && slugParts[slugParts.length - 1] === "request";

  const isDetail = !isRequest && slugParts.length >= 3;

  const templateSlug = isRequest
    ? slugParts[slugParts.length - 2]
    : isDetail
    ? slugParts[slugParts.length - 1]
    : undefined;

  if (isRequest && templateSlug) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading…</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Sign in to request a video</h2>
            <p className="text-sm text-gray-600">Please login to submit your video invitation request.</p>
            <div className="flex justify-center gap-3">
              <Link href={loginHref} className="px-4 py-2 rounded-lg bg-primary text-white font-semibold">
                Login
              </Link>
              <Link href={registerHref} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold">
                Register
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return <VideoRequestWizard templateSlug={templateSlug} />;
  }

  if (isDetail && templateSlug) {
    return <VideoDetail templateSlug={templateSlug} />;
  }

  return <VideoCatalog />;
}
