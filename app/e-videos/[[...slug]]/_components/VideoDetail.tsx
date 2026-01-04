"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { VideoInviteTemplate } from "@/lib/types";

export default function VideoDetail({ templateSlug }: { templateSlug: string }) {
  const [template, setTemplate] = useState<VideoInviteTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/e-video/templates/${templateSlug}`);
        const json = await res.json();
        if (json.success) setTemplate(json.data);
        else setError("Template not found");
      } catch {
        setError("Failed to load template");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [templateSlug]);

  if (loading)
    return (
      <main className="min-h-screen bg-[#f7f4ef] flex items-center justify-center">
        Loading…
      </main>
    );

  if (error || !template)
    return (
      <main className="min-h-screen bg-[#f7f4ef] flex items-center justify-center">
        {error}
      </main>
    );

  return (
    <div className="bg-[#f7f4ef] py-20 flex justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-[320px] aspect-9/16 rounded-2xl overflow-hidden shadow-2xl bg-black">
          <video
            src={template.preview_video_url}
            poster={template.preview_thumbnail_url || undefined}
            className="w-full h-full object-cover"
            controls
            autoPlay
            muted
          />
        </div>

        <p className="text-lg font-semibold">₹{template.price}</p>

        <Link
          href={`${pathname}/request`}
          className="px-8 py-3 rounded-xl bg-[#d18b47] text-white font-semibold"
        >
          Request to Make
        </Link>
      </div>
    </div>
  );
}
