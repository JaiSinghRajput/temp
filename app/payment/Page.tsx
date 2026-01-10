"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

type OrderInfo = {
  orderId: number;
  orderNumber?: string;
  status?: string; // pending/paid...
  total?: number; // rupees
  currency?: string; // INR
  title?: string; // optional nice title
  successRedirect?: string; // optional
};

export default function PaymentPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const orderIdParam = sp.get("orderId");

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  // optional display info (does not decide amount)
  const [info, setInfo] = useState<OrderInfo | null>(null);

  const orderId = useMemo(() => {
    const n = Number(orderIdParam);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [orderIdParam]);

  const readableAmount = useMemo(() => {
    if (!info?.total) return 0;
    return Number(info.total || 0);
  }, [info]);

  // Load Razorpay script + (optional) load order info
  useEffect(() => {
    if (!orderId) {
      toast.error("Invalid payment link");
      router.replace("/");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);

        /**
         * OPTIONAL:
         * If you have an order info API, use it.
         * This is only for UI display. Amount for payment is still decided by backend.
         *
         * You can implement:
         * GET /api/orders/info?id=<orderId>
         */
        try {
          const res = await fetch(`/api/orders/info?id=${orderId}`, { cache: "no-store" });
          const json = await res.json();
          if (json?.success) {
            setInfo(json.data);
          } else {
            setInfo({
              orderId,
              title: `Order #${orderId}`,
              successRedirect: "/my-videos",
            });
          }
        } catch {
          setInfo({
            orderId,
            title: `Order #${orderId}`,
            successRedirect: "/my-videos",
          });
        }

        // Razorpay script
        if (typeof window !== "undefined" && !window.Razorpay) {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;

          script.onerror = () => {
            toast.error("Failed to load payment gateway script");
          };

          document.body.appendChild(script);
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to load payment");
        router.replace("/");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orderId, router]);

  const startPayment = async () => {
    if (!orderId) return;

    try {
      setPaying(true);

      // ✅ Universal API: creates Razorpay order for DB order
      const res = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Failed to create Razorpay order");
      }

      // already paid
      if (json.data?.payment_status === "paid") {
        toast.success("Already paid ✅");
        router.replace(info?.successRedirect || "/my-videos");
        return;
      }

      const { order_id: razorpayOrderId, amount, currency, key } = json.data;

      if (!window.Razorpay) {
        toast.error("Payment gateway not ready. Please refresh.");
        setPaying(false);
        return;
      }

      const rzp = new window.Razorpay({
        key,
        amount, // paise
        currency: currency || "INR",
        name: "DWH Shop",
        description: info?.title || `Order #${orderId}`,
        order_id: razorpayOrderId,

        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyJson = await verifyRes.json();
            if (!verifyJson.success) {
              throw new Error(verifyJson.error || "Payment verification failed");
            }

            toast.success("Payment successful!");
            router.replace(info?.successRedirect || "/my-videos");
          } catch (err: any) {
            toast.error(err?.message || "Payment success but verification failed");
            setPaying(false);
          }
        },

        modal: {
          ondismiss: () => setPaying(false),
        },

        theme: { color: "#d18b47" },
      });

      rzp.open();
    } catch (err: any) {
      toast.error(err?.message || "Payment failed");
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f4ef] flex items-center justify-center p-10">
        <div className="bg-white border rounded-2xl shadow-sm p-6 w-full max-w-xl">
          <p className="text-gray-700 font-medium">Loading payment…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] py-10">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white border rounded-2xl shadow-sm p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Complete Payment</h1>
            <p className="text-sm text-gray-600">
              Complete secure payment for your order.
            </p>
          </div>

          {/* Payment box */}
          <div className="rounded-xl border p-4 bg-[#fff7ef] flex justify-between items-center gap-4">
            <div className="min-w-0">
              <p className="font-semibold truncate">
                {info?.title || `Order #${orderId}`}
              </p>
              <p className="text-sm text-gray-600">Ref: Order#{orderId}</p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-sm text-gray-600">Amount</p>

              {/* NOTE: purely UI display */}
              <p className="text-2xl font-bold text-[#d18b47]">
                {readableAmount ? `₹${readableAmount}` : "—"}
              </p>
            </div>
          </div>

          {/* Trust note */}
          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm text-gray-700 font-medium">Secure payment</p>
            <p className="text-xs text-gray-500 mt-1">
              Amount is calculated server-side from database order total. URL edits & client-side tampering won’t affect payment.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              disabled={paying}
              onClick={() => router.back()}
              className="px-4 py-2 border rounded-lg"
            >
              Back
            </button>

            <button
              disabled={paying}
              onClick={startPayment}
              className="px-6 py-2 rounded-lg bg-[#d18b47] text-white font-semibold shadow-md hover:opacity-95 disabled:opacity-60"
            >
              {paying ? "Processing…" : "Pay Now"}
            </button>
          </div>

          <p className="text-[11px] text-gray-500">
            Need help? Contact support with reference:{" "}
            <b>Order#{orderId}</b>
          </p>
        </div>
      </div>
    </main>
  );
}
