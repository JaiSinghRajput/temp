"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { CategorySidebar } from "@/components/layout/catalog";
import { slugify } from "@/lib/utils";
import { VideoInviteTemplate } from "@/lib/types";

function parseSlug(slugParam?: string | string[]) {
  const parts = Array.isArray(slugParam)
    ? slugParam
    : typeof slugParam === "string"
      ? [slugParam]
      : [];
  const [categorySlug, subcategorySlug] = parts;
  return { categorySlug, subcategorySlug };
}

export default function EVideosPage() {
  const params = useParams<{ slug?: string[] }>();
  const router = useRouter();

  const slugParts = Array.isArray(params.slug)
    ? params.slug
    : typeof params.slug === "string"
      ? [params.slug]
      : [];

  const isRequest = slugParts.length >= 4 && slugParts[slugParts.length - 1] === "request";
  const isDetail = !isRequest && slugParts.length >= 3;
  const templateSlug = isRequest
    ? slugParts[slugParts.length - 2]
    : isDetail
      ? slugParts[slugParts.length - 1]
      : undefined;

  const { categorySlug, subcategorySlug } = parseSlug(slugParts);

  const [categories, setCategories] = useState<any[]>([]);
  const [templates, setTemplates] = useState<VideoInviteTemplate[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(categorySlug);
  const [activeSubcategory, setActiveSubcategory] = useState<string | undefined>(subcategorySlug);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [detailTemplate, setDetailTemplate] = useState<VideoInviteTemplate | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string>("");

  const [formError, setFormError] = useState<string>("");
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [fieldValues, setFieldValues] = useState<Record<number, Record<string, any>>>({});
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  useEffect(() => {
    if (isDetail) return;
    const { categorySlug: catSlug, subcategorySlug: subSlug } = parseSlug(slugParts);
    setActiveCategory(catSlug);
    setActiveSubcategory(subSlug);
    fetchData(catSlug, subSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParts.join("/"), isDetail]);

  useEffect(() => {
    if ((!isDetail && !isRequest) || !templateSlug) return;
    const loadDetail = async () => {
      try {
        setDetailLoading(true);
        setDetailError("");
        const res = await fetch(`/api/e-video/templates/${templateSlug}`, { cache: "no-store" });
        const json = await res.json();
        if (json.success) {
          setDetailTemplate(json.data as VideoInviteTemplate);
          const tmpl = json.data as VideoInviteTemplate;
          const defaults: Record<number, Record<string, any>> = {};
          (tmpl.cards || []).forEach((card) => {
            const cardDefaults: Record<string, any> = {};
            (card.fields || []).forEach((f) => {
              cardDefaults[f.name] = "";
            });
            defaults[card.id] = cardDefaults;
          });
          setFieldValues(defaults);
        } else {
          setDetailError(json.error || "Template not found");
        }
      } catch (err) {
        console.error("Failed to load e-video template", err);
        setDetailError("Failed to load template");
      } finally {
        setDetailLoading(false);
      }
    };
    loadDetail();
  }, [isDetail, isRequest, templateSlug]);

  const cards = detailTemplate?.cards || [];
  const totalSteps = cards.length + 1;

  const activeCard = useMemo(() => {
    if (!cards.length) return null;
    if (activeStep >= cards.length) return cards[selectedCardIndex] || cards[0];
    return cards[activeStep];
  }, [cards, activeStep, selectedCardIndex]);

  const getValues = (cardId?: number) => {
    if (!cardId) return {} as Record<string, any>;
    return fieldValues[cardId] || {};
  };

  const updateField = (cardId: number, field: any, value: any) => {
    setFieldValues((prev) => ({
      ...prev,
      [cardId]: { ...(prev[cardId] || {}), [field.name]: value },
    }));
  };

  const validateCardStep = () => {
    if (!activeCard || activeStep >= cards.length) return true;
    const values = getValues(activeCard.id);
    const missing = (activeCard.fields || []).filter((f: any) => f.required !== false && !values[f.name]);
    if (missing.length > 0) {
      setFormError("Please fill all required fields for this card.");
      return false;
    }
    setFormError("");
    setSelectedCardIndex(activeStep);
    return true;
  };

  const handleNext = () => {
    if (activeStep < cards.length) {
      if (!validateCardStep()) return;
      setActiveStep((prev) => Math.min(prev + 1, totalSteps - 1));
      return;
    }
  };

  const handlePrev = () => {
    if (activeStep === 0) return;
    setFormError("");
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!detailTemplate || !cards.length) {
      setFormError("No card variation available to request.");
      return;
    }
    const card = cards[selectedCardIndex] || cards[0];
    const values = getValues(card.id);
    const missing = (card.fields || []).filter((f: any) => f.required !== false && !values[f.name]);
    if (missing.length > 0) {
      setFormError("Please fill all required fields for the selected card.");
      setActiveStep(Math.min(selectedCardIndex, cards.length - 1));
      return;
    }
    if (!requesterName || !requesterPhone) {
      setFormError("Name and phone are required to place a request.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/e-video/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: detailTemplate.id,
          card_id: card.id,
          requester_name: requesterName,
          requester_email: requesterEmail || null,
          requester_phone: requesterPhone,
          payload: values,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmittedId(json.data.id);
      } else {
        setFormError(json.error || "Failed to submit request.");
      }
    } catch (err) {
      console.error("Failed to submit e-video request", err);
      setFormError("Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchData = async (categorySlug?: string, subcategorySlug?: string) => {
    try {
      setLoading(true);
      setError("");

      const [catsRes, subsRes] = await Promise.all([
        fetch("/api/video-categories"),
        fetch("/api/video-subcategories"),
      ]);

      const catsJson = await catsRes.json();
      const subsJson = await subsRes.json();

      if (catsJson.success) {
        const subsByCategory: Record<number, any[]> = {};
        if (subsJson.success && Array.isArray(subsJson.data)) {
          subsJson.data.forEach((sub: any) => {
            if (!subsByCategory[sub.category_id]) subsByCategory[sub.category_id] = [];
            subsByCategory[sub.category_id].push(sub);
          });
        }

        const shaped = (catsJson.data || []).map((cat: any) => {
          const slug = cat.slug || slugify(cat.name || "");
          return {
            ...cat,
            slug,
            subcategories: (subsByCategory[cat.id] || []).map((sub) => ({
              ...sub,
              slug: sub.slug || slugify(sub.name || ""),
            })),
          };
        });
        setCategories(shaped);
      }

      const activeCategoryId = (catsJson.success && catsJson.data)
        ? (catsJson.data as any[]).find((c: any) => (c.slug || slugify(c.name || "")) === categorySlug)?.id
        : undefined;

      const subsList = subsJson.success && Array.isArray(subsJson.data) ? subsJson.data : [];
      const activeSubcategoryId = subsList.find((s: any) => (s.slug || slugify(s.name || "")) === subcategorySlug)?.id;

      const qs = new URLSearchParams();
      if (activeCategoryId) {
        qs.append("category_id", String(activeCategoryId));
      } else if (categorySlug) {
        qs.append("category_slug", categorySlug);
      }

      if (activeSubcategoryId) {
        qs.append("subcategory_id", String(activeSubcategoryId));
      } else if (subcategorySlug) {
        qs.append("subcategory_slug", subcategorySlug);
      }

      const templatesUrl = qs.toString() ? `/api/e-video/templates?${qs.toString()}` : "/api/e-video/templates";
      const templatesRes = await fetch(templatesUrl);
      const templatesJson = await templatesRes.json();

      if (templatesJson.success) {
        setTemplates(templatesJson.data || []);
      } else {
        setError(templatesJson.error || "Failed to load video invites");
      }
    } catch (err) {
      console.error("Failed to load e-videos", err);
      setError("Something went wrong while loading video invites");
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category?: string, subcategory?: string) => {
    const nextCategory = category || undefined;
    const nextSubcategory = subcategory || undefined;

    setActiveCategory(nextCategory);
    setActiveSubcategory(nextSubcategory);

    if (nextCategory) {
      const path = nextSubcategory ? `/e-videos/${nextCategory}/${nextSubcategory}` : `/e-videos/${nextCategory}`;
      router.push(path);
    } else {
      router.push("/e-videos");
    }
  };

  const allSubcategories = useMemo(() => categories.flatMap((c) => c.subcategories || []), [categories]);
  const activeCategoryName = useMemo(() => categories.find((c) => c.slug === activeCategory)?.name, [categories, activeCategory]);
  const activeSubcategoryName = useMemo(() => allSubcategories.find((s: any) => s.slug === activeSubcategory)?.name, [allSubcategories, activeSubcategory]);

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "E-Videos", href: "/e-videos" },
    activeCategory && activeCategoryName ? { label: activeCategoryName, href: `/e-videos/${activeCategory}` } : null,
    activeSubcategory && activeSubcategoryName && activeCategory
      ? { label: activeSubcategoryName, href: `/e-videos/${activeCategory}/${activeSubcategory}` }
      : null,
  ].filter(Boolean) as { label: string; href?: string }[];

  if (isDetail) {
    if (detailLoading) {
      return (
        <main className="min-h-screen bg-[#f7f4ef] flex items-center justify-center">
          <div className="text-gray-600">Loading video invite…</div>
        </main>
      );
    }

    if (detailError || !detailTemplate) {
      return (
        <main className="min-h-screen bg-[#f7f4ef] flex flex-col items-center justify-center px-4 text-center">
          <div className="text-4xl mb-3">😕</div>
          <p className="text-lg font-semibold text-gray-800 mb-2">{detailError || "Template not found"}</p>
          <button
            onClick={() => router.push("/e-videos")}
            className="mt-4 px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
          >
            Back to catalog
          </button>
        </main>
      );
    }
    return (
      <div className="w-full bg-[#f7f4ef] py-12 lg:py-16 flex justify-center">
        <div className="relative flex items-center justify-center">
          <div className="relative w-[320px] md:w-90 aspect-9/16 
      rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/10">

            <video
              className="w-full h-full object-cover"
              src={detailTemplate.preview_video_url}
              poster={detailTemplate.preview_thumbnail_url || undefined}
              controls
              autoPlay
              muted
              playsInline
            />

            {/* Watermark */}
            <span className="pointer-events-none absolute bottom-6 right-4 
        rotate-12deg text-amber-200/80 text-lg font-serif tracking-wide 
        drop-shadow-lg">
              Dream Wedding Hub
            </span>
          </div>
          <div className="mt-4 text-center text-gray-800 font-semibold">
            {detailTemplate.price ? `Price: ₹${detailTemplate.price}` : "Price not set"}
          </div>
        </div>
      </div>

    );
  }

  if (isRequest) {
    if (detailLoading) {
      return (
        <main className="min-h-screen bg-[#f7f4ef] flex items-center justify-center">
          <div className="text-gray-600">Loading request form…</div>
        </main>
      );
    }

    if (detailError || !detailTemplate) {
      return (
        <main className="min-h-screen bg-[#f7f4ef] flex flex-col items-center justify-center px-4 text-center">
          <div className="text-4xl mb-3">😕</div>
          <p className="text-lg font-semibold text-gray-800 mb-2">{detailError || "Template not found"}</p>
          <button
            onClick={() => router.push("/e-videos")}
            className="mt-4 px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
          >
            Back to catalog
          </button>
        </main>
      );
    }

    if (submittedId) {
      return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-emerald-50 to-blue-50 px-4 text-center">
          <div className="text-6xl mb-3">✅</div>
          <p className="text-xl font-semibold text-gray-800 mb-2">Request received!</p>
          <p className="text-gray-600 max-w-md">We will contact you soon to finalize your personalized video invite.</p>
          <button
            onClick={() => router.push("/e-videos")}
            className="mt-6 px-4 py-2 rounded-lg bg-[#d18b47] text-white font-semibold hover:bg-[#c07c3c]"
          >
            Back to catalog
          </button>
        </main>
      );
    }

    const onContinue = () => {
      if (activeStep < cards.length) {
        handleNext();
      } else {
        if (!paymentConfirmed) {
          setFormError("Please complete payment before submitting your request.");
          return;
        }
        handleSubmit();
      }
    };

    const onBack = () => {
      if (activeStep === 0) {
        const backParts = [...slugParts];
        backParts.pop();
        router.push(`/e-videos/${backParts.join("/")}`);
      } else {
        handlePrev();
      }
    };

    const isContactStep = activeStep >= cards.length;

    return (
      <main className="min-h-screen bg-[#f7f4ef]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#d18b47] font-semibold">Request</p>
                <h1 className="text-2xl font-bold text-gray-900">{detailTemplate.title}</h1>
                <p className="text-sm text-gray-600">Provide details for this video invite.</p>
              </div>
              <div className="text-sm text-gray-600">Step {Math.min(activeStep + 1, totalSteps)} of {totalSteps}</div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-sm text-gray-800 font-semibold">Price: {detailTemplate.price ? `₹${detailTemplate.price}` : "Not set"}</div>
              <div className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-2 text-gray-800">
                  <input
                    type="checkbox"
                    checked={paymentConfirmed}
                    onChange={(e) => setPaymentConfirmed(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span>I have completed the payment</span>
                </label>
              </div>
            </div>

            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                {formError}
              </div>
            )}

            {!isContactStep && activeCard && (
              <div className="space-y-6">
                <div className="flex items-center justify_between">
                  <p className="text-sm font-semibold text-gray-900">Card {activeStep + 1} of {cards.length}</p>
                  {activeCard.card_image_url && <span className="text-xs text-gray-500">Preview below</span>}
                </div>

                {activeCard.card_image_url && (
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    <img src={activeCard.card_image_url} alt={detailTemplate.title} className="w-full h-60 object-cover" />
                  </div>
                )}

                <div className="space-y-4">
                  {(activeCard.fields || []).map((field: any) => {
                    const values = getValues(activeCard.id);
                    const commonProps = {
                      className: "w-full rounded-lg border border-gray-300 px-3 py-2",
                      value: values[field.name] ?? "",
                      onChange: (e: any) => updateField(activeCard.id, field, e.target?.value),
                    } as const;

                    return (
                      <div key={field.id || field.name} className="space-y-2">
                        <div className="flex items-center justify_between gap-2">
                          <label className="text-sm font-medium text-gray-800">
                            {field.label} {field.required !== false && <span className="text-red-500">*</span>}
                          </label>
                          {field.helper_text && <span className="text-xs text-gray-500">{field.helper_text}</span>}
                        </div>

                        {field.field_type === "textarea" ? (
                          <textarea {...commonProps} rows={3} />
                        ) : field.field_type === "select" ? (
                          <select
                            className={commonProps.className}
                            value={values[field.name] ?? ""}
                            onChange={(e) => updateField(activeCard.id, field, e.target.value)}
                          >
                            <option value="">Select</option>
                            {(field.options || []).map((opt: any) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.field_type === "date" ? (
                          <input type="date" {...commonProps} />
                        ) : field.field_type === "email" ? (
                          <input type="email" {...commonProps} />
                        ) : field.field_type === "phone" ? (
                          <input type="tel" {...commonProps} />
                        ) : field.field_type === "url" ? (
                          <input type="url" {...commonProps} />
                        ) : field.field_type === "file" ? (
                          <input
                            type="file"
                            className={commonProps.className}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              updateField(activeCard.id, field, file ? file.name : "");
                            }}
                          />
                        ) : (
                          <input type="text" {...commonProps} />
                        )}
                      </div>
                    );
                  })}

                  {(activeCard.fields || []).length === 0 && (
                    <p className="text-sm text-gray-600">No extra details needed for this card.</p>
                  )}
                </div>
              </div>
            )}

            {isContactStep && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Your contact details</p>
                  <p className="text-xs text-gray-600">We will use these to confirm your request.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-800">Full name *</label>
                    <input
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font_medium text-gray-800">Phone *</label>
                    <input
                      value={requesterPhone}
                      onChange={(e) => setRequesterPhone(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      placeholder="+1 555 123 4567"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium text-gray-800">Email (optional)</label>
                    <input
                      value={requesterEmail}
                      onChange={(e) => setRequesterEmail(e.target.value)}
                      type="email"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {activeCard && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 space-y-2">
                    <p className="font-semibold text-gray-900">Selected card</p>
                    {activeCard.card_image_url ? (
                      <img src={activeCard.card_image_url} alt={detailTemplate.title} className="w-full h-36 object-cover rounded-md" />
                    ) : (
                      <div className="h-24 w-full bg-gray-200 rounded-md flex items-center justify-center text-xs text-gray-500">No preview</div>
                    )}
                    {(activeCard.fields || []).length > 0 && (
                      <ul className="list-disc list-inside text-xs text-gray-600">
                        {(activeCard.fields || []).map((f: any) => (
                          <li key={f.id || f.name}>{f.label}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={onBack}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50"
              >
                {activeStep === 0 ? "Back to preview" : "Back"}
              </button>
              <div className="flex items-center gap-3">
                {activeStep < cards.length && cards.length > 1 && (
                  <p className="text-xs text-gray-500">Card {activeStep + 1} of {cards.length}</p>
                )}
                <button
                  onClick={onContinue}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-lg bg-[#d18b47] text-white font-semibold hover:bg-[#c07c3c] disabled:opacity-60"
                >
                  {activeStep < cards.length ? "Next" : submitting ? "Sending..." : "Submit request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef]">
      <PageHeader
        title={activeSubcategoryName || activeCategoryName || "E-Video Invitations"}
        breadcrumbs={breadcrumbs}
      />

      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-14">
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
          <div className="space-y-12 grid lg:grid-cols-4 lg:gap-8 lg:space-y-0">
            <CategorySidebar
              categories={categories}
              activeCategory={activeCategory}
              activeSubcategory={activeSubcategory}
              onSelect={handleCategorySelect}
              className="col-span-1"
            />

            <section className="col-span-3 space-y-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-gray-900">Video Invitations</h2>
                <p className="text-sm text-gray-600">Pick a style and send a request with your details.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((video) => {
                  const pathParts = ['/e-videos'];
                  if (video.category_slug) pathParts.push(video.category_slug);
                  if (video.subcategory_slug) pathParts.push(video.subcategory_slug);
                  pathParts.push(video.slug);
                  const href = pathParts.join('/');

                  return (
                    <div
                      key={video.id}
                      className="bg-white rounded-2xl border shadow-sm hover:shadow-lg transition overflow-hidden flex flex-col"
                    >
                      <div className="relative h-56 bg-gray-100 flex items-center justify-center">
                        {video.preview_thumbnail_url ? (
                          <img
                            src={video.preview_thumbnail_url}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            className="w-full h-full object-cover"
                            src={video.preview_video_url}
                            controls
                          />
                        )}
                        <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold bg-white border">
                          Video
                        </span>
                      </div>

                      <div className="p-5 flex-1 flex flex-col gap-3">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-[#d18b47] font-semibold">E-Video Invite</p>
                          <h3 className="font-semibold text-gray-900 line-clamp-2">{video.title}</h3>
                          {typeof video.price !== "undefined" && video.price !== null && (
                            <p className="text-sm font-semibold text-gray-800">₹{video.price}</p>
                          )}
                          {video.description && (
                            <p className="text-sm text-gray-600 line-clamp-3">{video.description}</p>
                          )}
                        </div>

                        <div className="mt-auto space-y-2">
                          <Link
                            href={href}
                            className="block w-full text-center py-2.5 border border-gray-300 text-gray-800 rounded-lg font-semibold hover:border-gray-400 transition"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {templates.length === 0 && (
                <div className="bg-white border rounded-2xl p-10 text-center text-gray-600">
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
