"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { VideoInviteRequest } from '@/lib/types';
import axiosInstance from '@/lib/axios';
import { paymentService } from '@/services/payment.service';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function MyVideosPage() {
  const { user, loading } = useAuth();
  const [requests, setRequests] = useState<VideoInviteRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);

  const ensureRazorpay = () =>
    new Promise<void>((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is not available'));
        return;
      }
      if (window.Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay'));
      document.body.appendChild(script);
    });

  useEffect(() => {
    if (!user) {
      setRequests([]);
      setRequestsLoading(false);
      return;
    }

    const fetchRequests = async () => {
      try {
        const res = await axiosInstance.get(`/api/e-video/requests?userId=${user.uid}`);
        if (res.data?.success) {
          setRequests(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load video requests', err);
      } finally {
        setRequestsLoading(false);
      }
    };

    fetchRequests();
  }, [user]);

  const handlePayNow = async (req: VideoInviteRequest) => {
    if (!req.template_price || req.template_pricing_type !== 'premium') {
      toast.info('No payment required for this request');
      return;
    }

    setPayingId(req.id);

    try {
      await ensureRazorpay();
      const amountPaise = Math.round(Number(req.template_price) * 100);

      const orderJson = await paymentService.createVideoOrder({
        amount: amountPaise,
        template_id: req.template_id,
        request_id: req.id,
      } as any);

      if (!orderJson?.success) {
        throw new Error(orderJson?.error || 'Failed to start payment');
      }

      const orderData = orderJson.data || {};

      if (orderData.payment_status === 'paid' || orderData.payment_required === false) {
        setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, payment_status: 'paid' } : r)));
        toast.success('Payment completed');
        setPayingId(null);
        return;
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Video Request Payment',
        description: req.template_title || 'Video Invitation',
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            const verifyJson = await paymentService.verifyVideoPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              request_id: req.id,
            });

            if (verifyJson?.success) {
              setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, payment_status: 'paid', payment_id: response.razorpay_payment_id } : r)));
              toast.success('Payment successful');
            } else {
              toast.error(verifyJson?.error || 'Payment verification failed');
            }
          } catch (verifyErr) {
            console.error('Payment verification failed', verifyErr);
            toast.error('Payment verification failed');
          } finally {
            setPayingId(null);
          }
        },
        modal: {
          ondismiss: () => setPayingId(null),
        },
        prefill: {
          name: user?.name,
          email: user?.email || undefined,
          contact: user?.mobile || undefined,
        },
        theme: { color: '#0F172A' },
      } as any;

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', () => setPayingId(null));
      rzp.open();
    } catch (err: any) {
      console.error('Payment failed to start', err);
      toast.error(err?.message || 'Unable to start payment');
      setPayingId(null);
    }
  };

  if (loading || requestsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your video requests...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white shadow-lg rounded-2xl p-8 text-center max-w-md w-full">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Sign in to view your video requests</h2>
          <p className="text-gray-600 mb-6">Log in to track status and complete payments.</p>
          <div className="flex justify-center gap-3">
            <Link href="/login" className="px-4 py-2 rounded-lg bg-primary text-white font-semibold">Login</Link>
            <Link href="/register" className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold">Register</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Video Requests</h1>
            <p className="text-sm text-gray-600">Track your submissions, drafts, and payments.</p>
          </div>
          <Link href="/e-videos" className="text-primary font-semibold hover:underline">Browse Videos</Link>
        </div>

        {requests.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-500">
            You have no video requests yet.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y">
            {requests.map((req, idx) => {
              const isPremium = req.template_pricing_type === 'premium';
              const isPaid = req.payment_status === 'paid';
              const templatePath = req.template_slug
                ? req.template_category_slug && req.template_subcategory_slug
                  ? `/e-videos/${req.template_category_slug}/${req.template_subcategory_slug}/${req.template_slug}`
                  : `/e-videos/${req.template_slug}`
                : '/e-videos';
              const requestPath = req.template_slug
                ? req.template_category_slug && req.template_subcategory_slug
                  ? `/e-videos/${req.template_category_slug}/${req.template_subcategory_slug}/${req.template_slug}/request?requestId=${req.id}`
                  : `/e-videos/${req.template_slug}/request?requestId=${req.id}`
                : '/e-videos';

              const key = `${req.id}-${idx}`;

              return (
                <div key={key} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">Request #{req.id}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        req.status === 'draft'
                          ? 'bg-gray-100 text-gray-800'
                          : req.status === 'done'
                          ? 'bg-green-100 text-green-800'
                          : req.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : req.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {req.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {isPaid ? 'Paid' : 'Payment Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{req.template_title || 'Video Template'}</p>
                    <p className="text-xs text-gray-500">{req.created_at ? new Date(req.created_at).toLocaleString() : ''}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === 'draft' && req.template_slug && (
                      <Link
                        href={requestPath}
                        className="px-4 py-2 rounded-lg border text-sm font-semibold text-gray-800 hover:bg-gray-50"
                      >
                        Resume Draft
                      </Link>
                    )}
                    {isPremium && !isPaid && (
                      <button
                        disabled={payingId === req.id}
                        onClick={() => handlePayNow(req)}
                        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60"
                      >
                        {payingId === req.id ? 'Processing...' : 'Pay Now'}
                      </button>
                    )}
                    <Link
                      href={templatePath}
                      className="px-4 py-2 rounded-lg border text-sm font-semibold text-gray-800 hover:bg-gray-50"
                    >
                      View Template
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
