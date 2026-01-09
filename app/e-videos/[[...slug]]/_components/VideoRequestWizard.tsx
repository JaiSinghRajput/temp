"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VideoInviteTemplate, VideoInviteField } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import Stepper from "./Stepper";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function VideoRequestWizard({
  templateSlug,
}: {
  templateSlug: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [template, setTemplate] = useState<VideoInviteTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);

  // 🔥 FIXED DATA MODEL (values per card)
  const [fieldValues, setFieldValues] = useState<
    Record<number, Record<string, any>>
  >({});

  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/e-video/templates/${templateSlug}`);
      const json = await res.json();
      if (json.success) setTemplate(json.data);
      setLoading(false);
    };
    load();

    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [templateSlug]);

  // Load draft payload if requestId is present
  useEffect(() => {
    const requestId = searchParams?.get('requestId');
    if (!requestId) return;

    const loadDraft = async () => {
      try {
        const res = await fetch(`/api/e-video/requests?id=${requestId}`);
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data) || !json.data.length) return;

        const request = json.data[0];
        const payload = request.payload || {};
        const restored: Record<number, Record<string, any>> = {};

        Object.entries(payload).forEach(([key, value]) => {
          const match = key.match(/^card_(\d+)_(.+)$/);
          if (!match) return;
          const idx = Number(match[1]);
          const field = match[2];
          if (!restored[idx]) restored[idx] = {};
          restored[idx][field] = value;
        });

        setFieldValues(restored);
      } catch (err) {
        console.error('Failed to load draft payload', err);
      }
    };

    loadDraft();
  }, [searchParams]);

  if (loading || !template) {
    return <div className="min-h-screen bg-[#f7f4ef] p-8">Loading…</div>;
  }

  const cards = template.cards || [];
  const steps = [...cards.map((_, i) => `Card ${i + 1}`), "Review & Pay"];
  const isReviewStep = activeStep >= cards.length;
  const activeCard = cards[activeStep];

  const templatePrice = Number(template.price || 0);
  const isPremium = templatePrice > 0;

  // -----------------------------
  // Field helpers
  // -----------------------------
  const currentCardValues = fieldValues[activeStep] || {};

  const updateField = (name: string, value: any) => {
    setFieldValues((prev) => ({
      ...prev,
      [activeStep]: {
        ...(prev[activeStep] || {}),
        [name]: value,
      },
    }));
  };

  const clearCurrentCardFields = () => {
    setFieldValues((prev) => ({
      ...prev,
      [activeStep]: {},
    }));
  };

  // -----------------------------
  // Submit + Payment
  // -----------------------------
  const buildPayload = () => {
    return Object.entries(fieldValues).reduce(
      (acc, [cardIndex, cardData]) => {
        Object.entries(cardData).forEach(([key, value]) => {
          acc[`card_${cardIndex}_${key}`] = value;
        });
        return acc;
      },
      {} as Record<string, any>
    );
  };

  const saveDraft = async () => {
    if (!user) {
      toast.error("Please login to continue");
      return;
    }

    try {
      setPaying(true);
      const payload = buildPayload();
      const requestId = searchParams?.get('requestId');

      const res = await fetch(requestId ? "/api/e-video/requests" : "/api/e-video/requests", {
        method: requestId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(requestId ? { id: Number(requestId) } : { template_id: template.id }),
          user_id: user.uid,
          requester_name: user.name,
          requester_email: user.email || null,
          requester_phone: user.mobile || null,
          payload,
          status: 'draft',
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to save draft');

      toast.success('Draft saved successfully. Complete payment during submission.');
      router.push('/my-videos');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save draft');
    } finally {
      setPaying(false);
    }
  };

  const handlePaymentAndSubmit = async () => {
    if (!user) {
      toast.error("Please login to continue");
      return;
    }

    try {
      setPaying(true);

      const payload = buildPayload();
      const requestId = searchParams?.get('requestId');

      console.log('📤 [VideoRequestWizard] Submitting with:', {
        template_id: template.id,
        user_id: user.uid,
        requester_name: user.name,
        cardCount: cards.length,
        collectedCards: Object.keys(fieldValues).length,
        totalFields: Object.keys(payload).length,
        payload: payload,
      });

      // ✅ FREE TEMPLATE - skip payment, set status to submitted immediately
      const isDev = process.env.NODE_ENV === 'development';
      
      if (!isPremium || isDev) {
        const createRes = await fetch(requestId ? "/api/e-video/requests" : "/api/e-video/requests", {
          method: requestId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(requestId ? { id: Number(requestId) } : { template_id: template.id }),
            user_id: user.uid,
            requester_name: user.name,
            requester_email: user.email || null,
            requester_phone: user.mobile || null,
            payload,
            status: 'submitted',
          }),
        });

        const createJson = await createRes.json();
        if (!createJson.success) {
          throw new Error(createJson.error || "Failed to submit request");
        }

        if (isDev && isPremium) {
          toast.success(`Request submitted! (Dev mode: ₹${templatePrice} payment skipped)`);
        } else {
          toast.success("Request submitted successfully!");
        }
        router.push("/my-videos");
        return;
      }

      // ✅ PRODUCTION + PREMIUM - trigger Razorpay FIRST, then set status after payment
      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: Math.round(templatePrice * 100),
        currency: "INR",
        name: "Video Invitation",
        description: template.title,
        handler: async () => {
          try {
            // After payment succeeds, update status to submitted
            const submitRes = await fetch(requestId ? "/api/e-video/requests" : "/api/e-video/requests", {
              method: requestId ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...(requestId ? { id: Number(requestId) } : { template_id: template.id }),
                user_id: user.uid,
                requester_name: user.name,
                requester_email: user.email || null,
                requester_phone: user.mobile || null,
                payload,
                status: 'submitted',
              }),
            });

            const submitJson = await submitRes.json();
            if (!submitJson.success) {
              throw new Error(submitJson.error || "Failed to update request status");
            }

            toast.success("Payment successful! Request submitted.");
            router.push("/my-videos");
          } catch (err: any) {
            toast.error(err?.message || "Failed to update request after payment");
            setPaying(false);
          }
        },
        prefill: {
          name: user.name,
          email: user.email || "",
          contact: user.mobile || "",
        },
        theme: { color: "#d18b47" },
      });

      rzp.open();
    } catch (err: any) {
      toast.error(err?.message || "Submission failed");
      setPaying(false);
    }
  };

  // -----------------------------
  // Field renderer
  // -----------------------------
  const renderField = (field: VideoInviteField) => {
    const value = currentCardValues[field.name] || "";
    const base =
      "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#d18b47]";

    switch (field.field_type) {
      case "textarea":
        return (
          <textarea
            className={base}
            rows={4}
            value={value}
            onChange={(e) => updateField(field.name, e.target.value)}
          />
        );
      case "select":
        return (
          <select
            className={base}
            value={value}
            onChange={(e) => updateField(field.name, e.target.value)}
          >
            <option value="">Select</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case "date":
        return (
          <input
            type="date"
            className={base}
            value={value}
            onChange={(e) => updateField(field.name, e.target.value)}
          />
        );
      default:
        return (
          <input
            type="text"
            className={base}
            value={value}
            onChange={(e) => updateField(field.name, e.target.value)}
          />
        );
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f4ef] py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
          {/* LEFT: Card + Price */}
          <div className="space-y-4">
            {activeCard?.card_image_url && (
              <img
                src={activeCard.card_image_url}
                className="w-full rounded-xl border shadow-md"
                alt="Card preview"
              />
            )}

            {isPremium && (
              <div className="bg-white border rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600">Price</p>
                <p className="text-2xl font-bold text-[#d18b47]">
                  ₹{templatePrice}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: Form */}
          <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold">{template.title}</h2>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>

            <Stepper steps={steps} currentStep={activeStep} />

            {!isReviewStep && activeCard && (
              <div className="space-y-4">
                {(activeCard.fields || []).map((f) => (
                  <div key={f.name}>
                    <label className="block text-sm font-medium mb-1">
                      {f.label}
                    </label>
                    {renderField(f)}
                  </div>
                ))}
              </div>
            )}

            {isReviewStep && (
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-bold mb-2">Your Information</h3>
                  <p>
                    <strong>Name:</strong> {user?.name}
                  </p>
                  {user?.email && (
                    <p>
                      <strong>Email:</strong> {user.email}
                    </p>
                  )}
                  {user?.mobile && (
                    <p>
                      <strong>Phone:</strong> {user.mobile}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="font-bold mb-2">Collected Data</h3>
                  <div className="bg-gray-50 p-3 rounded text-xs max-h-64 overflow-y-auto">
                    {Object.keys(fieldValues).length === 0 ? (
                      <p className="text-gray-500">No data collected yet</p>
                    ) : (
                      Object.entries(fieldValues).map(([cardIndex, cardData]) => (
                        <div key={cardIndex} className="mb-3 pb-3 border-b">
                          <p className="font-semibold">Card {parseInt(cardIndex) + 1}:</p>
                          {Object.entries(cardData).length === 0 ? (
                            <p className="text-gray-400 ml-2">No fields filled</p>
                          ) : (
                            Object.entries(cardData).map(([key, value]) => (
                              <p key={key} className="ml-2">
                                <strong>{key}:</strong> {String(value)}
                              </p>
                            ))
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
              <button
                onClick={() =>
                  activeStep === 0
                    ? router.back()
                    : setActiveStep((s) => s - 1)
                }
                className="px-4 py-2 border rounded-lg"
              >
                Back
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={paying}
                  onClick={saveDraft}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Save Draft
                </button>

              <button
                disabled={paying}
                onClick={() => {
                  if (isReviewStep) {
                    handlePaymentAndSubmit();
                  } else {
                    // Move to next step without clearing data
                    setActiveStep((s) => s + 1);
                  }
                }}
                className="px-6 py-2 rounded-lg bg-[#d18b47] text-white font-semibold"
              >
                {isReviewStep
                  ? isPremium
                    ? "Pay & Submit"
                    : "Submit"
                  : "Next"}
              </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
