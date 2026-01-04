"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axiosInstance from '@/lib/axios';
import { AdminHeader } from '@/components/admin/admin-header';
import { VideoInviteRequest, VideoInviteTemplate } from '@/lib/types';
import { ArrowBack, ChevronLeft, ChevronRight, Download } from '@mui/icons-material';

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

export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [request, setRequest] = useState<RequestRow | null>(null);
  const [template, setTemplate] = useState<VideoInviteTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const cards = template?.cards || [];
  const currentCard = cards[currentCardIndex];
  const totalCards = cards.length;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load request - use direct query to get all requests and filter
        const resReq = await axiosInstance.get(`/api/e-video/requests`);
        if (resReq.data.success && resReq.data.data) {
          const req = resReq.data.data.find((r: any) => r.id === parseInt(id));
          if (!req) {
            setError('Request not found');
            return;
          }
          setRequest(req);

          // Load template
          if (req.template_slug) {
            try {
              const resTpl = await axiosInstance.get(`/api/e-video/templates/${req.template_slug}?includeInactive=1`);
              if (resTpl.data.success) {
                setTemplate(resTpl.data.data);
              }
            } catch (err) {
              console.error('Failed to load template', err);
            }
          }
        } else {
          setError('Request not found');
        }
      } catch (err) {
        console.error('Failed to load request', err);
        setError('Failed to load request');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      load();
    }
  }, [id]);

  const updateStatus = async (status: RequestRow['status'], admin_notes?: string | null) => {
    if (!request) return;
    setUpdatingId(request.id);
    try {
      const res = await axiosInstance.put('/api/e-video/requests', {
        id: request.id,
        status,
        admin_notes: admin_notes ?? null,
      });
      if (res.data.success) {
        setRequest({ ...request, status, admin_notes });
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

  const exportRequestData = () => {
    if (!request) return;
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
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error || 'Request not found'}
          </div>
          <button
            onClick={() => router.back()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700"
          >
            <ArrowBack sx={{ fontSize: 18 }} />
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader 
        title={`Request #${request.id}`} 
        subtitle={request.template_title || 'Video Request'} 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
        >
          <ArrowBack sx={{ fontSize: 18 }} />
          Back to Requests
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Card Preview & Navigation */}
          <div className="lg:col-span-2 space-y-4">
            {/* Card Navigation */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Card {currentCardIndex + 1} of {totalCards}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                    disabled={currentCardIndex === 0}
                    className="p-2 rounded-lg bg-gray-100 text-gray-700 disabled:opacity-30 hover:bg-gray-200"
                  >
                    <ChevronLeft />
                  </button>
                  <button
                    onClick={() => setCurrentCardIndex(Math.min(totalCards - 1, currentCardIndex + 1))}
                    disabled={currentCardIndex === totalCards - 1}
                    className="p-2 rounded-lg bg-gray-100 text-gray-700 disabled:opacity-30 hover:bg-gray-200"
                  >
                    <ChevronRight />
                  </button>
                </div>
              </div>

              {currentCard?.card_image_url ? (
                <img
                  src={currentCard.card_image_url}
                  alt={`Card ${currentCardIndex + 1}`}
                  className="w-300 rounded-lg border-2 border-gray-200"
                />
              ) : (
                <div className="w-full aspect-square bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center text-gray-400">
                  No card image
                </div>
              )}
            </div>

            {/* Card Fields Data */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Field Values for Card {currentCardIndex + 1}</h4>
              <div className="space-y-3">
                {(currentCard?.fields || []).map((field) => {
                  // Extract the value from payload using card-prefixed key
                  const prefixedKey = `card_${currentCardIndex}_${field.name}`;
                  const value = request.payload?.[prefixedKey];
                  
                  return (
                    <div key={field.name} className="border-b border-gray-200 pb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900">
                        {value || (
                          <span className="text-gray-400 italic">Not provided</span>
                        )}
                      </div>
                      {field.helper_text && (
                        <p className="text-xs text-gray-500 mt-1">{field.helper_text}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Request Info & Actions */}
          <div className="lg:col-span-1 space-y-4">
            {/* Payment Status Badge */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Status</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  request.payment_status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {request.payment_status === 'paid' ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Requester Info */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Requester Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-gray-600 mb-1">Name</label>
                  <div className="text-gray-900 font-medium">{request.requester_name}</div>
                </div>
                {request.requester_email && (
                  <div>
                    <label className="block text-gray-600 mb-1">Email</label>
                    <div className="text-gray-900">{request.requester_email}</div>
                  </div>
                )}
                {request.requester_phone && (
                  <div>
                    <label className="block text-gray-600 mb-1">Phone</label>
                    <div className="text-gray-900">{request.requester_phone}</div>
                  </div>
                )}
                <div>
                  <label className="block text-gray-600 mb-1">Created</label>
                  <div className="text-gray-900">
                    {request.created_at ? new Date(request.created_at).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Update */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h3>
              <select
                value={request.status}
                onChange={(e) => updateStatus(e.target.value as RequestRow['status'], request.admin_notes)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 mb-4 text-gray-900"
                disabled={updatingId === request.id}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
              <textarea
                value={request.admin_notes || ''}
                onChange={(e) => {
                  setRequest({ ...request, admin_notes: e.target.value });
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 mb-4 text-gray-900"
                rows={6}
                placeholder="Add notes about this request..."
              />

              <button
                onClick={() => updateStatus(request.status, request.admin_notes)}
                disabled={updatingId === request.id}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {updatingId === request.id ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={exportRequestData}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700"
            >
              <Download sx={{ fontSize: 18 }} />
              Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
