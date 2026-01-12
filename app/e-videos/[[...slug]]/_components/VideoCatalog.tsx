"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { CategorySidebar } from "@/components/layout/catalog";
import { slugify, buildUrl } from "@/lib/utils";
import { VideoInviteTemplate } from "@/lib/types";
import { VideocategoryService } from "@/services";
import VideoCard from "@/components/Home/VideoCard";
import { Video } from "lucide-react";

function parseSlug(slugParam?: string | string[]) {
  const parts = Array.isArray(slugParam)
    ? slugParam
    : typeof slugParam === "string"
      ? [slugParam]
      : [];
  const [categorySlug, subcategorySlug] = parts;
  return { categorySlug, subcategorySlug };
}

export default function VideoCatalog() {
  const params = useParams<{ slug?: string[] }>();
  const router = useRouter();

  const slugParts = Array.isArray(params.slug)
    ? params.slug
    : typeof params.slug === "string"
      ? [params.slug]
      : [];

  const { categorySlug, subcategorySlug } = parseSlug(slugParts);

  const [categories, setCategories] = useState<any[]>([]);
  const [templates, setTemplates] = useState<VideoInviteTemplate[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(
    categorySlug
  );
  const [activeSubcategory, setActiveSubcategory] = useState<
    string | undefined
  >(subcategorySlug);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ---------------- Fetch Data ---------------- */

  useEffect(() => {
    fetchData(categorySlug, subcategorySlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParts.join("/")]);

  const fetchData = async (
    categorySlug?: string,
    subcategorySlug?: string
  ) => {
    try {
      setLoading(true);
      setError("");

      const [catsRes, subsRes] = await Promise.all([
      VideocategoryService.getVideoCategories(),
      VideocategoryService.getVideoSubcategories(),
      ]);

      /* ----- Shape categories ----- */
      if (catsRes.success && Array.isArray(catsRes.data)) {
        const subsByCategory: Record<number, any[]> = {};
        if (subsRes.success && Array.isArray(subsRes.data)) {
          subsRes.data.forEach((sub: any) => {
            if (!subsByCategory[sub.category_id]) {
              subsByCategory[sub.category_id] = [];
            }
            subsByCategory[sub.category_id].push(sub);
          });
        }

        const shaped = catsRes.data.map((cat: any) => ({
          ...cat,
          slug: cat.slug || slugify(cat.name || ""),
          subcategories: (subsByCategory[cat.id] || []).map((sub) => ({
            ...sub,
            slug: sub.slug || slugify(sub.name || ""),
          })),
        }));

        setCategories(shaped);
      }

      // Build query parameters using slug values
      const qs = new URLSearchParams();
      if (categorySlug) qs.append("category_slug", categorySlug);
      if (subcategorySlug) qs.append("subcategory_slug", subcategorySlug);

      const url = qs.toString()
        ? `/api/e-video/templates?${qs.toString()}`
        : "/api/e-video/templates";

      const templatesRes = await fetch(url);
      const templatesJson = await templatesRes.json();

      if (templatesJson.success) {
        setTemplates(templatesJson.data || []);
      } else {
        setError("Failed to load video invites");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while loading video invites");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Handlers ---------------- */

  const handleCategorySelect = (category?: string, subcategory?: string) => {
    setActiveCategory(category);
    setActiveSubcategory(subcategory);

    if (category) {
      router.push(
        subcategory
          ? `/e-videos/${category}/${subcategory}`
          : `/e-videos/${category}`
      );
    } else {
      router.push("/e-videos");
    }
  };

  const allSubcategories = useMemo(
    () => categories.flatMap((c) => c.subcategories || []),
    [categories]
  );

  const activeCategoryName = useMemo(
    () => categories.find((c) => c.slug === activeCategory)?.name,
    [categories, activeCategory]
  );

  const activeSubcategoryName = useMemo(
    () => allSubcategories.find((s: any) => s.slug === activeSubcategory)?.name,
    [allSubcategories, activeSubcategory]
  );

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "E-Videos", href: "/e-videos" },
    activeCategory && activeCategoryName
      ? {
        label: activeCategoryName,
        href: `/e-videos/${activeCategory}`,
      }
      : null,
    activeSubcategory && activeSubcategoryName && activeCategory
      ? {
        label: activeSubcategoryName,
        href: `/e-videos/${activeCategory}/${activeSubcategory}`,
      }
      : null,
  ].filter(Boolean) as { label: string; href?: string }[];

  /* ---------------- Render ---------------- */

  return (
    <main className="min-h-screen bg-[#f7f4ef]">
      <PageHeader
        title={activeSubcategoryName || activeCategoryName || "E-Video Invitations"}
        breadcrumbs={breadcrumbs}
      />

      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex flex-col items-center py-24">
            <div className="w-12 h-12 border-4 border-[#d18b47] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600">Loading video invites…</p>
          </div>
        ) : error ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => fetchData(activeCategory, activeSubcategory)}
              className="mt-6 px-6 py-2.5 bg-[#d18b47] text-white rounded-lg font-semibold"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <CategorySidebar
              categories={categories}
              activeCategory={activeCategory}
              activeSubcategory={activeSubcategory}
              onSelect={handleCategorySelect}
            />

            {/* Grid */}
            <section className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((video) => {
                const videoUrl = buildUrl(video);
                return (
                  <VideoCard
                    key={video.id}
                    image={video.preview_thumbnail_url || ""}
                    name={video.title || "Video Invitation"}
                    price={video.price || 0}
                    link={videoUrl}
                  />
                );
              })}

              {templates.length === 0 && (
                <div className="lg:col-span-3 bg-white border rounded-2xl p-10 text-center text-gray-600">
                  No video invites found for this selection.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
