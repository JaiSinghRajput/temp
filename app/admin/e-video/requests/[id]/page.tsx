"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { AdminHeader } from "@/components/admin/admin-header";
import { VideoInviteRequest, VideoInviteTemplate } from "@/lib/types";
import { ArrowBack, ChevronLeft, ChevronRight } from "@mui/icons-material";

const PRIMARY = "#d66e4b";

const STATUS_OPTIONS: Array<VideoInviteRequest["status"]> = [
  "new",
  "in_progress",
  "done",
  "cancelled",
];

interface RequestRow extends VideoInviteRequest {
  template_title?: string;
  template_slug?: string;
  card_image_url?: string | null;
  payment_status?: "pending" | "paid";
}

export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [request, setRequest] = useState<RequestRow | null>(null);
  const [template, setTemplate] = useState<VideoInviteTemplate | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  // Edit state (so you can change without spamming API)
  const [draftStatus, setDraftStatus] = useState<RequestRow["status"]>("new");
  const [draftNotes, setDraftNotes] = useState("");

  const cards = template?.cards || [];
  const totalCards = cards.length;
  const currentCard = cards[currentCardIndex];

  // Build list of fields for current card
  const currentFields = useMemo(() => {
    return currentCard?.fields || [];
  }, [currentCard]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // ✅ If you have a better endpoint: /api/e-video/requests/:id use that.
        // For now keeping your old approach but cleaner.
        const resReq = await axiosInstance.get(`/api/e-video/requests`);

        if (resReq.data.success && resReq.data.data) {
          const req = resReq.data.data.find((r: any) => r.id === parseInt(id));
          if (!req) {
            setError("Request not found");
            return;
          }

          setRequest(req);
          setDraftStatus(req.status);
          setDraftNotes(req.admin_notes || "");

          // Load template
          if (req.template_slug) {
            try {
              const resTpl = await axiosInstance.get(
                `/api/e-video/templates/${req.template_slug}?includeInactive=1`
              );
              if (resTpl.data.success) {
                setTemplate(resTpl.data.data);
              }
            } catch (err) {
              console.error("Failed to load template", err);
            }
          }
        } else {
          setError("Request not found");
        }
      } catch (err) {
        console.error("Failed to load request", err);
        setError("Failed to load request");
      } finally {
        setLoading(false);
      }
    };

    if (id) load();
  }, [id]);

  // Keep card index valid when template loads
  useEffect(() => {
    if (!totalCards) return;
    if (currentCardIndex > totalCards - 1) setCurrentCardIndex(0);
  }, [totalCards, currentCardIndex]);

  const saveChanges = async () => {
    if (!request) return;

    setSaving(true);
    try {
      const res = await axiosInstance.put("/api/e-video/requests", {
        id: request.id,
        status: draftStatus,
        admin_notes: draftNotes?.trim() || null,
      });

      if (res.data.success) {
        setRequest({ ...request, status: draftStatus, admin_notes: draftNotes });
      } else {
        alert(res.data.error || "Failed to update");
      }
    } catch (err) {
      console.error("Failed to update request", err);
      alert("Failed to update request");
    } finally {
      setSaving(false);
    }
  };

  const paymentBadge = (request?.payment_status || "pending") === "paid";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Request Details" subtitle="Loading..." />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-500">Loading request...</div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Request Details" subtitle="Error" />
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
          <div
            className="rounded-2xl border px-4 py-3 text-sm shadow-sm"
            style={{
              borderColor: "rgba(239,68,68,0.35)",
              backgroundColor: "rgba(239,68,68,0.08)",
              color: "#b91c1c",
            }}
          >
            <div className="font-semibold">Something went wrong</div>
            <div className="text-xs mt-1">{error || "Request not found"}</div>
          </div>

          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white text-gray-900 text-sm font-semibold hover:bg-gray-50 active:scale-[0.98]"
            style={{ borderColor: "rgba(0,0,0,0.12)" }}
          >
            <ArrowBack sx={{ fontSize: 18 }} />
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AdminHeader
        title={`Request #${request.id}`}
        subtitle={request.template_title || "Video Request"}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-white text-gray-900 text-sm font-semibold hover:bg-gray-50 active:scale-[0.98]"
            style={{ borderColor: "rgba(0,0,0,0.12)" }}
          >
            <ArrowBack sx={{ fontSize: 18 }} />
            Back to Requests
          </button>

          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: paymentBadge
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(234,179,8,0.15)",
                color: paymentBadge ? "#15803d" : "#a16207",
              }}
            >
              {paymentBadge ? "Paid" : "Pending"}
            </span>

            <span className="text-xs text-gray-500">
              Created:{" "}
              <span className="font-semibold text-gray-900">
                {request.created_at
                  ? new Date(request.created_at).toLocaleString()
                  : "N/A"}
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-2 space-y-4">
            {/* Card Preview */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Card Preview
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Card {totalCards ? currentCardIndex + 1 : 0} of {totalCards}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentCardIndex((v) => Math.max(0, v - 1))}
                    disabled={currentCardIndex === 0}
                    className="h-9 w-9 rounded-xl border bg-white text-gray-700 disabled:opacity-40 hover:bg-gray-50 active:scale-[0.98]"
                    style={{ borderColor: "rgba(0,0,0,0.12)" }}
                  >
                    <ChevronLeft />
                  </button>

                  <button
                    onClick={() =>
                      setCurrentCardIndex((v) => Math.min(totalCards - 1, v + 1))
                    }
                    disabled={!totalCards || currentCardIndex === totalCards - 1}
                    className="h-9 w-9 rounded-xl border bg-white text-gray-700 disabled:opacity-40 hover:bg-gray-50 active:scale-[0.98]"
                    style={{ borderColor: "rgba(0,0,0,0.12)" }}
                  >
                    <ChevronRight />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {currentCard?.card_image_url ? (
                  <div
                    className="rounded-2xl border bg-gray-50 overflow-hidden flex items-center justify-center"
                    style={{ borderColor: "rgba(0,0,0,0.10)" }}
                  >
                    <img
                      src={currentCard.card_image_url}
                      alt={`Card ${currentCardIndex + 1}`}
                      className="w-full object-contain"
                      style={{
                        maxHeight: 420, // ✅ fix: no huge image
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="w-full rounded-2xl border bg-gray-50 flex items-center justify-center text-gray-400"
                    style={{
                      borderColor: "rgba(0,0,0,0.10)",
                      height: 320,
                    }}
                  >
                    No card image
                  </div>
                )}
              </div>
            </div>

            {/* Field Values */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h4 className="text-sm font-semibold text-gray-900">
                  Field Values
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Values submitted for this card.
                </p>
              </div>

              <div className="p-6 space-y-3">
                {currentFields.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    No fields defined for this card.
                  </div>
                ) : (
                  currentFields.map((field) => {
                    const prefixedKey = `card_${currentCardIndex}_${field.name}`;
                    const value = request.payload?.[prefixedKey];

                    return (
                      <div
                        key={field.name}
                        className="rounded-2xl border bg-white p-4"
                        style={{ borderColor: "rgba(0,0,0,0.10)" }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-xs font-semibold text-gray-600">
                              {field.label}
                              {field.required ? (
                                <span className="ml-1 text-red-500">*</span>
                              ) : null}
                            </div>
                            {field.helper_text ? (
                              <div className="text-[11px] text-gray-500 mt-1">
                                {field.helper_text}
                              </div>
                            ) : null}
                          </div>

                          <div className="text-xs font-semibold text-gray-500">
                            {field.field_type}
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-900">
                          {value ? (
                            String(value)
                          ) : (
                            <span className="text-gray-400 italic">
                              Not provided
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-1 space-y-4">
            {/* Requester */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="text-sm font-semibold text-gray-900">
                  Requester
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-gray-600">Name</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">
                    {request.requester_name}
                  </div>
                </div>

                {request.requester_email ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-600">Email</div>
                    <div className="text-sm text-gray-900 mt-1">
                      {request.requester_email}
                    </div>
                  </div>
                ) : null}

                {request.requester_phone ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-600">Phone</div>
                    <div className="text-sm text-gray-900 mt-1">
                      {request.requester_phone}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Editor */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="text-sm font-semibold text-gray-900">
                  Admin Editor
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update status and leave internal notes.
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Status */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600">
                    Status
                  </label>
                  <select
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value as RequestRow["status"])}
                    disabled={saving}
                    className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none disabled:opacity-60"
                    style={{ borderColor: "rgba(0,0,0,0.10)" }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = PRIMARY;
                      e.currentTarget.style.boxShadow =
                        "0 0 0 4px rgba(214,110,75,0.20)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(0,0,0,0.10)";
                      e.currentTarget.style.boxShadow =
                        "0 1px 2px rgba(0,0,0,0.06)";
                    }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600">
                    Admin Notes
                  </label>
                  <textarea
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    disabled={saving}
                    rows={7}
                    placeholder="Write internal notes..."
                    className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none resize-none disabled:opacity-60"
                    style={{ borderColor: "rgba(0,0,0,0.10)" }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = PRIMARY;
                      e.currentTarget.style.boxShadow =
                        "0 0 0 4px rgba(214,110,75,0.20)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(0,0,0,0.10)";
                      e.currentTarget.style.boxShadow =
                        "0 1px 2px rgba(0,0,0,0.06)";
                    }}
                  />
                </div>

                {/* Save button */}
                <button
                  onClick={saveChanges}
                  disabled={saving || (draftStatus === request.status && draftNotes === (request.admin_notes || ""))}
                  className="w-full px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition disabled:opacity-60 active:scale-[0.98]"
                  style={{
                    backgroundColor: PRIMARY,
                    boxShadow: "0 10px 20px rgba(214,110,75,0.25)",
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                {/* Hint */}
                <div className="text-[11px] text-gray-500">
                  Saves status + notes for this request.
                </div>
              </div>
            </div>

            {/* Remove unwanted export json */}
          </div>
        </div>
      </div>
    </div>
  );
}
