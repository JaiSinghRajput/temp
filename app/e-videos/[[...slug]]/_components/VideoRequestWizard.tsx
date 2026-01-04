"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VideoInviteTemplate } from "@/lib/types";
import Stepper from "./Stepper";

export default function VideoRequestWizard({
  templateSlug,
}: {
  templateSlug: string;
}) {
  const router = useRouter();

  const [template, setTemplate] = useState<VideoInviteTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [fieldValues, setFieldValues] = useState<any>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/e-video/templates/${templateSlug}`);
      const json = await res.json();
      if (json.success) setTemplate(json.data);
      setLoading(false);
    };
    load();
  }, [templateSlug]);

  if (loading || !template)
    return <div className="min-h-screen bg-[#f7f4ef]">Loading…</div>;

  const cards = template.cards || [];
  const steps = [...cards.map((_, i) => `Card ${i + 1}`), "Contact"];
  const isContactStep = activeStep >= cards.length;

  const activeCard = cards[activeStep];

  const updateField = (name: string, value: any) =>
    setFieldValues((p: any) => ({ ...p, [name]: value }));

  return (
    <main className="min-h-screen bg-[#f7f4ef] py-12">
      <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-[260px_1fr] gap-8">
        {/* Preview */}
        <div className="hidden lg:block sticky top-24">
          {activeCard?.card_image_url && (
            <img
              src={activeCard.card_image_url}
              className="rounded-xl border"
            />
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border p-6 space-y-6">
          <Stepper steps={steps} currentStep={activeStep} />

          {!isContactStep && activeCard && (
            <div className="space-y-4">
              {(activeCard.fields || []).map((f: any) => (
                <input
                  key={f.name}
                  placeholder={f.label}
                  className="w-full border rounded-lg px-3 py-2"
                  value={fieldValues[f.name] || ""}
                  onChange={(e) => updateField(f.name, e.target.value)}
                />
              ))}
            </div>
          )}

          {isContactStep && (
            <div className="space-y-4">
              <input
                placeholder="Full Name"
                className="w-full border rounded-lg px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                placeholder="Phone"
                className="w-full border rounded-lg px-3 py-2"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={paymentConfirmed}
                  onChange={(e) => setPaymentConfirmed(e.target.checked)}
                />
                Payment completed
              </label>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={() =>
                activeStep === 0
                  ? router.back()
                  : setActiveStep((s) => s - 1)
              }
            >
              Back
            </button>

            <button
              onClick={() =>
                isContactStep
                  ? setSubmitting(true)
                  : setActiveStep((s) => s + 1)
              }
              className="px-5 py-2 rounded-lg bg-[#d18b47] text-white"
            >
              {isContactStep ? "Submit" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
