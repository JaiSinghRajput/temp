"use client";

import { useParams } from "next/navigation";
import VideoRequestWizard from "./_components/VideoRequestWizard";
import VideoCatalog from "./_components/VideoCatalog";
import VideoDetail from "./_components/VideoDetail";

export default function EVideosPage() {
  const params = useParams<{ slug?: string[] }>();

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
    return <VideoRequestWizard templateSlug={templateSlug} />;
  }

  if (isDetail && templateSlug) {
    return <VideoDetail templateSlug={templateSlug} />;
  }

  return <VideoCatalog />;
}
