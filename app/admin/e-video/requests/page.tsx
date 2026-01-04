"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/lib/axios';
import { AdminHeader } from '@/components/admin/admin-header';
import { VideoInviteRequest } from '@/lib/types';
import { Download, VisibilityOutlined } from '@mui/icons-material';

const STATUS_OPTIONS: Array<VideoInviteRequest['status']> = [
  'new',
  'in_progress',
  'done',
  'cancelled',
];

interface RequestRow extends VideoInviteRequest {
  template_title?: string;
  template_slug?: string;
  card_image_url?: string | null;
  payment_status?: 'pending' | 'paid';
}

export default function EVideoRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const statusOk = statusFilter ? r.status === statusFilter : true;
      const paymentOk = paymentFilter ? r.payment_status === paymentFilter : true;
      const text = `${r.requester_name} ${r.requester_email ?? ''} ${r.template_title ?? ''}`.toLowerCase();
      const searchOk = search ? text.includes(search.toLowerCase()) : true;
      return statusOk && paymentOk && searchOk;
    });
  }, [requests, statusFilter, paymentFilter, search]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (statusFilter) qs.set('status', statusFilter);
        if (paymentFilter) qs.set('paymentStatus', paymentFilter);
        if (fromDate) qs.set('from', fromDate);
        if (toDate) qs.set('to', toDate);
        const qsString = qs.toString();
        const res = await axiosInstance.get(`/api/e-video/requests${qsString ? `?${qsString}` : ''}`);
        if (res.data.success) {
          setRequests(res.data.data || []);
        } else {
          setError(res.data.error || 'Failed to load requests');
        }
      } catch (err) {
        const apiError = (err as any)?.response?.data?.error;
        console.error('Failed to load requests', err);
        setError(apiError || 'Failed to load requests');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [statusFilter, paymentFilter, fromDate, toDate]);

  const updateStatus = async (id: number, status: RequestRow['status'], admin_notes?: string | null) => {
    setUpdatingId(id);
    try {
      const res = await axiosInstance.put('/api/e-video/requests', {
        id,
        status,
        admin_notes: admin_notes ?? null,
      });
      if (res.data.success) {
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status, admin_notes } : r)));
      } else {
        alert(res.data.error || 'Failed to update');
      }
    } catch (err) {
      console.error('Failed to update request', err);
      alert('Failed to update request');
    } finally {
      setUpdatingId(null);
    }
  };

  const openFullScreenView = async (request: RequestRow) => {
    router.push(`/admin/e-video/requests/${request.id}`);
  };

  const exportRequestData = (request: RequestRow) => {
    const data = {
      id: request.id,
      template: request.template_title,
      requester: {
        name: request.requester_name,
        email: request.requester_email,
        phone: request.requester_phone,
      },
      fields: request.payload,
      status: request.status,
      notes: request.admin_notes,
      created_at: request.created_at,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-request-${request.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-16">
        <AdminHeader title="E-Video Requests" subtitle="Manage incoming video invite requests" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
              {error}
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <option value="">All payments</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-md border px-3 py-2 text-sm"
                placeholder="Search by name or email"
              />

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <label className="text-xs text-gray-500">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-md border px-3 py-2 text-sm"
                />
                <label className="text-xs text-gray-500">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-md border px-3 py-2 text-sm"
                />
              </div>

              {(statusFilter || paymentFilter || fromDate || toDate) && (
                <button
                  onClick={() => {
                    setStatusFilter('');
                    setPaymentFilter('');
                    setFromDate('');
                    setToDate('');
                  }}
                  className="text-xs text-blue-600 underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="text-sm text-gray-500">{requests.length} total · {filtered.length} shown</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-6 text-sm text-gray-500">Loading requests…</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">No requests found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Requester</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Template</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Created</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filtered.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">#{req.id}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{req.requester_name}</div>
                          {req.requester_email && <div className="text-xs text-gray-500">{req.requester_email}</div>}
                          {req.requester_phone && <div className="text-xs text-gray-500">{req.requester_phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{req.template_title || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <select
                            value={req.status}
                            onChange={(e) => updateStatus(req.id, e.target.value as RequestRow['status'], req.admin_notes ?? undefined)}
                            className="rounded-md border px-2 py-1 text-xs"
                            disabled={updatingId === req.id}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${req.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {req.payment_status || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => openFullScreenView(req)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                          >
                            <VisibilityOutlined sx={{ fontSize: 14 }} />
                            View
                          </button>
                          <button
                            onClick={() => exportRequestData(req)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-gray-600 text-white text-xs font-semibold hover:bg-gray-700"
                          >
                            <Download sx={{ fontSize: 14 }} />
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
    </>
  );
}

