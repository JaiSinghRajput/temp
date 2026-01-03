"use client";

import { useEffect, useMemo, useState } from 'react';
import axiosInstance from '@/lib/axios';
import { AdminHeader } from '@/components/admin/admin-header';
import { VideoInviteRequest } from '@/lib/types';

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
}

export default function EVideoRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const statusOk = statusFilter ? r.status === statusFilter : true;
      const text = `${r.requester_name} ${r.requester_email ?? ''} ${r.template_title ?? ''}`.toLowerCase();
      const searchOk = search ? text.includes(search.toLowerCase()) : true;
      return statusOk && searchOk;
    });
  }, [requests, statusFilter, search]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
        const res = await axiosInstance.get(`/api/e-video/requests${qs}`);
        if (res.data.success) {
          setRequests(res.data.data || []);
        } else {
          setError(res.data.error || 'Failed to load requests');
        }
      } catch (err) {
        console.error('Failed to load requests', err);
        setError('Failed to load requests');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [statusFilter]);

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

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AdminHeader title="E-Video Requests" subtitle="Manage incoming video invite requests" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
              placeholder="Search by name or email"
            />
          </div>

          <div className="text-sm text-gray-500">{requests.length} total · {filtered.length} shown</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600">
            <div className="col-span-3">Requester</div>
            <div className="col-span-2">Template</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Payload</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading requests…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No requests found.</div>
          ) : (
            <div className="divide-y">
              {filtered.map((req) => (
                <div key={req.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-start text-sm">
                  <div className="col-span-3 space-y-1">
                    <p className="font-semibold text-gray-900">{req.requester_name}</p>
                    {req.requester_email && <p className="text-gray-600 text-xs">{req.requester_email}</p>}
                    {req.requester_phone && <p className="text-gray-600 text-xs">{req.requester_phone}</p>}
                  </div>

                  <div className="col-span-2 space-y-1">
                    <p className="text-gray-800">{req.template_title || 'Template'}</p>
                    {req.template_slug && (
                      <p className="text-xs text-gray-500">/{req.template_slug}</p>
                    )}
                  </div>

                  <div className="col-span-2">
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
                  </div>

                  <div className="col-span-3">
                    <div className="bg-gray-50 border rounded-md p-2 text-xs text-gray-700 max-h-32 overflow-auto">
                      {Object.keys(req.payload || {}).length === 0 ? (
                        <span className="text-gray-400">No payload</span>
                      ) : (
                        <pre className="whitespace-pre-wrap wrap-break-word text-[11px] leading-relaxed">{JSON.stringify(req.payload, null, 2)}</pre>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 text-right space-y-2">
                    <textarea
                      value={req.admin_notes || ''}
                      onChange={(e) => setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, admin_notes: e.target.value } : r)))}
                      placeholder="Admin notes"
                      className="w-full rounded-md border px-2 py-1 text-xs"
                      rows={3}
                    />
                    <button
                      onClick={() => updateStatus(req.id, req.status, req.admin_notes ?? undefined)}
                      disabled={updatingId === req.id}
                      className="px-3 py-1 rounded-md bg-primary text-white text-xs font-semibold disabled:opacity-60"
                    >
                      {updatingId === req.id ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
