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
    const requestId = searchParams?.get("requestId");
    if (!requestId) return;

    const loadDraft = async () => {
      try {
        const res = await fetch(`/api/e-video/requests?id=${requestId}`);
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data) || !json.data.length)
          return;

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
        console.error("Failed to load draft payload", err);
      }
    };

    loadDraft();
  }, [searchParams]);

  if (loading || !template) {
    return <div className="min-h-screen bg-[#f7f4ef] p-8">Loading…</div>;
  }

  const cards = template.cards || [];
  const steps = [...cards.map((_, i) => `Card ${i + 1}`), "Payment"];
  const isPaymentStep = activeStep === cards.length;
  const activeCard = !isPaymentStep ? cards[activeStep] : null;
  const isLastCard = activeStep === cards.length - 1;


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

  // -----------------------------
  // Submit + Payment
  // -----------------------------
  const buildPayload = () => {
    return Object.entries(fieldValues).reduce((acc, [cardIndex, cardData]) => {
      Object.entries(cardData).forEach(([key, value]) => {
        acc[`card_${cardIndex}_${key}`] = value;
      });
      return acc;
    }, {} as Record<string, any>);
  };

  const saveDraft = async () => {
    if (!user) {
      toast.error("Please login to continue");
      return;
    }

    try {
      setPaying(true);
      const payload = buildPayload();
      const requestId = searchParams?.get("requestId");

      const res = await fetch("/api/e-video/requests", {
        method: requestId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(requestId
            ? { id: Number(requestId) }
            : { template_id: template.id }),
          user_id: user.uid,
          requester_name: user.name,
          requester_email: user.email || null,
          requester_phone: user.mobile || null,
          payload,
          status: "draft",
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save draft");

      toast.success("Draft saved successfully.");
      router.push("/my-videos");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save draft");
    } finally {
      setPaying(false);
    }
  };
  const handleProceed = async () => {
    if (!user) {
      toast.error("Please login to continue");
      return;
    }

    try {
      setPaying(true);

      const payload = buildPayload();
      const requestId = searchParams?.get("requestId");
      const isDev = process.env.NODE_ENV === "development";

      // 1) Save/Update request as submitted/draft first
      const res = await fetch("/api/e-video/requests", {
        method: requestId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(requestId
            ? { id: Number(requestId) }
            : { template_id: template.id }),
          user_id: user.uid,
          requester_name: user.name,
          requester_email: user.email || null,
          requester_phone: user.mobile || null,
          payload,
          status: isPremium ? "submitted" : "submitted",
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save request");
      if (!isPremium || isDev) {
        toast.success(
          isDev && isPremium
            ? `Request submitted! (Dev mode: payment skipped)`
            : "Request submitted successfully!"
        );
        router.push("/my-videos");
        return;
      }

      // 3) Premium: create DB order server-side and redirect to payment page
      // ✅ IMPORTANT: You need a server-side api that creates order from request/custom content
      const orderRes = await fetch("/api/orders/from-video-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: json.data?.id || Number(requestId),
        }),
      });

      const orderJson = await orderRes.json();
      if (!orderJson.success) {
        throw new Error(orderJson.error || "Failed to create order");
      }

      const orderId = orderJson.data.orderId;

      router.push(`/payment?orderId=${orderId}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to continue");
    } finally {
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
          </div>

          {/* RIGHT: Form */}
          <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold">{template.title}</h2>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>

            <Stepper steps={steps} currentStep={activeStep} />

            {!isPaymentStep && activeCard && (
              <div className="space-y-4">
                {(activeCard.fields || []).map((f) => (
                  <div key={f.name}>
                    <label className="block text-sm font-medium mb-1">{f.label}</label>
                    {renderField(f)}
                  </div>
                ))}
              </div>
            )}

            {isPaymentStep && (
              <div className="rounded-2xl border bg-[#fff7ef] p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold text-[#7a3f10]">Payment</p>
                    <p className="text-sm text-[#7a3f10]/80">
                      {isPremium
                        ? "Pay securely to submit your request."
                        : "No payment required. Submit your request."}
                    </p>
                  </div>

                  {isPremium && (
                    <span className="text-sm font-semibold px-3 py-1 rounded-full bg-white border text-[#d18b47]">
                      ₹{templatePrice}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
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
                    onClick={handleProceed}
                    className="px-6 py-2 rounded-lg bg-[#d18b47] text-white font-semibold shadow-md hover:opacity-95 disabled:opacity-60"
                  >
                    {isPremium ? "Proceed to Payment" : "Submit"}
                  </button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  if (activeStep === 0) router.back();
                  else setActiveStep((s) => s - 1);
                }}
                className="px-4 py-2 border rounded-lg"
                disabled={paying}
              >
                Back
              </button>

              {/* Right controls */}
              {!isPaymentStep && (
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
                      if (isLastCard) {
                        // ✅ go to payment step
                        setActiveStep(cards.length);
                      } else {
                        setActiveStep((s) => s + 1);
                      }
                    }}
                    className="px-6 py-2 rounded-lg bg-[#d18b47] text-white font-semibold"
                  >
                    {isLastCard ? "Continue" : "Next"}
                  </button>
                </div>
              )}

              {/* On payment step: buttons are inside payment card */}
              {isPaymentStep && <div />}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
