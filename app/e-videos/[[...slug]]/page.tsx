"use client";

import { useEffect, useMemo } from "react";
import { useParams, usePathname, useSearchParams, useRouter } from "next/navigation";
import VideoRequestWizard from "./_components/VideoRequestWizard";
import VideoCatalog from "./_components/VideoCatalog";
import VideoDetail from "./_components/VideoDetail";
import { useAuth } from "@/contexts/AuthContext";

export default function EVideosPage() {
  const params = useParams<{ slug?: string[] }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 🔐 Preserve full path for redirect
  const currentPath = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  const authHref = `/login?next=${encodeURIComponent(currentPath)}`;

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

  // ----------------------------------
  // 🔁 Auto-redirect if auth required
  // ----------------------------------
  useEffect(() => {
    if (!isRequest) return;
    if (loading) return;

    if (!user) {
      router.replace(authHref);
    }
  }, [isRequest, user, loading, authHref, router]);

  // ----------------------------------
  // Loading state
  // ----------------------------------
  if (isRequest && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  // ----------------------------------
  // Request flow (authenticated only)
  // ----------------------------------
  if (isRequest && templateSlug) {
    if (!user) {
      // Redirect is already triggered by useEffect
      return null;
    }

    return <VideoRequestWizard templateSlug={templateSlug} />;
  }

  // ----------------------------------
  // Detail page (public)
  // ----------------------------------
  if (isDetail && templateSlug) {
    return <VideoDetail templateSlug={templateSlug} />;
  }

  // ----------------------------------
  // Catalog (public)
  // ----------------------------------
  return <VideoCatalog />;
}
