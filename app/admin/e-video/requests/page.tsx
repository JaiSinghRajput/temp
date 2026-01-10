"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { AdminHeader } from "@/components/admin/admin-header";
import { VideoInviteRequest } from "@/lib/types";
import { VisibilityOutlined } from "@mui/icons-material";

const PRIMARY = "#d66e4b";

const STATUS_OPTIONS: Array<VideoInviteRequest["status"]> = [
  "paid",
  "completed",
  "cancelled",
];

interface RequestRow extends VideoInviteRequest {
  template_title?: string;
  template_slug?: string;
  card_image_url?: string | null;
  payment_status?: "pending" | "paid";
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  requester_email?: string | null;
  requester_phone?: string | null;
}

export default function EVideoRequestsPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("paid");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const statusOk = statusFilter ? r.status === statusFilter : true;
      const text = `${r.requester_name ?? r.user_name ?? ""} ${r.requester_email ?? r.user_email ?? ""} ${r.template_title ?? ""}`.toLowerCase();
      const searchOk = search ? text.includes(search.toLowerCase()) : true;
      return statusOk && searchOk;
    });
  }, [requests, statusFilter, search]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const qs = new URLSearchParams();
        qs.set("status", statusFilter || "paid");
        if (fromDate) qs.set("from", fromDate);
        if (toDate) qs.set("to", toDate);

        const qsString = qs.toString();
        const res = await axiosInstance.get(
          `/api/e-video/requests${qsString ? `?${qsString}` : ""}`
        );

        if (res.data.success) {
          setRequests(res.data.data || []);
        } else {
          setError(res.data.error || "Failed to load requests");
        }
      } catch (err) {
        const apiError = (err as any)?.response?.data?.error;
        console.error("Failed to load requests", err);
        setError(apiError || "Failed to load requests");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [statusFilter, fromDate, toDate]);

  const updateStatus = async (
    id: number,
    status: RequestRow["status"],
    admin_notes?: string | null
  ) => {
    setUpdatingId(id);

    try {
      const res = await axiosInstance.put("/api/e-video/requests", {
        id,
        status,
        admin_notes: admin_notes ?? null,
      });

      if (res.data.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status, admin_notes } : r))
        );
      } else {
        alert(res.data.error || "Failed to update");
      }
    } catch (err) {
      console.error("Failed to update request", err);
      alert("Failed to update request");
    } finally {
      setUpdatingId(null);
    }
  };

  const openFullScreenView = (request: RequestRow) => {
    router.push(`/admin/e-video/requests/${request.id}`);
  };

  const hasFilters = Boolean((statusFilter && statusFilter !== "paid") || fromDate || toDate || search);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AdminHeader
        title="E-Video Requests"
        subtitle="Manage incoming video invite requests"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Error */}
        {error && (
          <div
            className="rounded-2xl border px-4 py-3 text-sm shadow-sm"
            style={{
              borderColor: "rgba(239,68,68,0.35)",
              backgroundColor: "rgba(239,68,68,0.08)",
              color: "#b91c1c",
            }}
          >
            <div className="font-semibold">Something went wrong</div>
            <div className="text-xs mt-1">{error}</div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              {/* status (locked to paid/completed) */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none"
                style={{ borderColor: "rgba(0,0,0,0.10)" }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>

              {/* search */}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none"
                style={{ borderColor: "rgba(0,0,0,0.10)" }}
                placeholder="Search name / email / template"
              />

              {/* date filters */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <label className="text-xs text-gray-500">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-xl border bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none"
                  style={{ borderColor: "rgba(0,0,0,0.10)" }}
                />

                <label className="text-xs text-gray-500">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-xl border bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none"
                  style={{ borderColor: "rgba(0,0,0,0.10)" }}
                />
              </div>

              {hasFilters && (
                <button
                  onClick={() => {
                    setStatusFilter("paid");
                    setFromDate("");
                    setToDate("");
                    setSearch("");
                  }}
                  className="rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-gray-50 active:scale-[0.98]"
                  style={{ borderColor: "rgba(0,0,0,0.12)", color: "#111827" }}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="text-sm text-gray-500">
              {requests.length} total · <span className="font-semibold text-gray-900">{filtered.length}</span> shown
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading requests…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Requester
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Template
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                        #{req.id}
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900">
                          {req.requester_name ?? req.user_name ?? "Unknown"}
                        </div>
                        {(req.requester_email ?? req.user_email) && (
                          <div className="text-xs text-gray-500">{req.requester_email ?? req.user_email}</div>
                        )}
                        {(req.requester_phone ?? req.user_phone) && (
                          <div className="text-xs text-gray-500">{req.requester_phone ?? req.user_phone}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-700">
                        {req.template_title || "N/A"}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <select
                          value={req.status}
                          onChange={(e) =>
                            updateStatus(
                              req.id,
                              e.target.value as RequestRow["status"],
                              req.admin_notes ?? undefined
                            )
                          }
                          className="rounded-xl border bg-white px-3 py-2 text-xs font-semibold shadow-sm focus:outline-none disabled:opacity-60"
                          style={{
                            borderColor: "rgba(0,0,0,0.10)",
                          }}
                          disabled={updatingId === req.id}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Payment */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor:
                              req.payment_status === "paid"
                                ? "rgba(34,197,94,0.15)"
                                : "rgba(234,179,8,0.15)",
                            color:
                              req.payment_status === "paid"
                                ? "#15803d"
                                : "#a16207",
                          }}
                        >
                          {req.payment_status || "paid"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-500">
                        {req.created_at ? new Date(req.created_at).toLocaleDateString() : "N/A"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openFullScreenView(req)}
                          className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition active:scale-[0.98]"
                          style={{
                            backgroundColor: PRIMARY,
                            boxShadow: "0 10px 20px rgba(214,110,75,0.25)",
                          }}
                        >
                          <VisibilityOutlined sx={{ fontSize: 16 }} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
