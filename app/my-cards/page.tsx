"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserEcard } from '@/lib/types';
import { userEcardService, paymentService } from '@/services';
import jsPDF from 'jspdf';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function MyCardsPage() {
  const { user, loading } = useAuth();
  const [cards, setCards] = useState<UserEcard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<number | null>(null);

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
      setCards([]);
      setCardsLoading(false);
      return;
    }

    const fetchCards = async () => {
      try {
        const result = await userEcardService.getUserEcards(user.uid);
        if (result.success) {
          setCards(result.data || []);
        }
      } catch (err) {
        console.error('Failed to load user cards', err);
      } finally {
        setCardsLoading(false);
      }
    };

    fetchCards();
  }, [user]);

  const handleDownload = async (card: UserEcard, previewUrl?: string | null) => {
    if (typeof window === 'undefined') return;

    const preview = previewUrl || card.preview_url;
    if (!preview) {
      alert('Preview not available for this card');
      return;
    }

    // Free or already-paid cards download directly
    if (card.pricing_type !== 'premium' || card.payment_status === 'paid') {
      window.open(preview, '_blank', 'noopener');
      return;
    }

    setPayingId(card.id);

    try {
      await ensureRazorpay();

      const orderJson = await paymentService.createOrder({ user_ecard_id: card.id } as any);
      if (!orderJson?.success) {
        throw new Error(orderJson?.error || 'Failed to start payment');
      }

      const orderData = orderJson.data || {};

      if (orderData.payment_status === 'paid' || orderData.payment_required === false) {
        setCards((prev) =>
          prev.map((c) => (c.id === card.id ? { ...c, payment_status: 'paid' } : c))
        );
        window.open(preview, '_blank', 'noopener');
        setPayingId(null);
        return;
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'E-Card Download',
        description: 'Complete payment to download your premium card',
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            const verifyJson = await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              ecard_id: card.id,
            });
            if (verifyJson?.success) {
              setCards((prev) =>
                prev.map((c) =>
                  c.id === card.id
                    ? {
                        ...c,
                        payment_status: 'paid',
                        payment_id: response.razorpay_payment_id,
                        payment_order_id: response.razorpay_order_id,
                        payment_signature: response.razorpay_signature,
                      }
                    : c
                )
              );
              window.open(preview, '_blank', 'noopener');
            } else {
              alert(verifyJson?.error || 'Payment verification failed');
            }
          } catch (verifyErr) {
            console.error('Payment verification failed', verifyErr);
            alert('Payment verification failed');
          } finally {
            setPayingId(null);
          }
        },
        modal: {
          ondismiss: () => setPayingId(null),
        },
        theme: { color: '#0F172A' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', () => setPayingId(null));
      rzp.open();
    } catch (err: any) {
      console.error('Download flow failed', err);
      alert(err?.message || 'Unable to start payment');
      setPayingId(null);
    }
  };

  const handleDownloadPdf = async (card: UserEcard) => {
    try {
      setGeneratingPdfId(card.id);

      // Parse customized data
      const customizedData = typeof card.customized_data === 'string'
        ? JSON.parse(card.customized_data)
        : card.customized_data;

      // Check if multipage
      const isMultipage = customizedData?.is_multipage && customizedData?.pages && customizedData.pages.length > 1;
      
      if (!isMultipage) {
        // For single page, just open the preview
        const preview = card.preview_url;
        if (preview) {
          window.open(preview, '_blank', 'noopener');
        }
        return;
      }

      // Dynamic import Canvas and loadTextOnlyCanvas
      const { Canvas } = await import('fabric');
      const { loadTextOnlyCanvas } = await import('@/lib/text-only-canvas-renderer');

      const pageImages: string[] = [];

      // Render each page to canvas
      for (let i = 0; i < customizedData.pages.length; i++) {
        const pageData = customizedData.pages[i];
        const pageCanvasData = pageData?.canvasData || customizedData;
        const pageTextElements = pageCanvasData?.textElements || [];
        const pageBackgroundUrl = pageData?.imageUrl;
        const pageBackgroundId = pageData?.backgroundId;
        const pageWidth = pageCanvasData?.canvasWidth || 800;
        const pageHeight = pageCanvasData?.canvasHeight || 600;

        // Create temporary canvas for rendering
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = pageWidth;
        tempCanvas.height = pageHeight;

        const fabricCanvas = new Canvas(tempCanvas, {
          width: pageWidth,
          height: pageHeight,
          selection: false,
        });

        // Load and render page with text
        await loadTextOnlyCanvas({
          canvas: fabricCanvas,
          imageUrl: pageBackgroundUrl,
          backgroundId: pageBackgroundId,
          textElements: pageTextElements,
          canvasWidth: pageWidth,
          canvasHeight: pageHeight,
          scale: 1, // Full resolution
          customFonts: pageCanvasData?.customFonts,
        });

        // Wait for fonts and rendering
        await new Promise(resolve => setTimeout(resolve, 300));

        // Capture page as image
        const dataUrl = fabricCanvas.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 1,
        });

        pageImages.push(dataUrl);
        fabricCanvas.dispose();
      }

      // Get canvas dimensions from first page
      const firstPageData = customizedData.pages[0]?.canvasData || customizedData;
      const canvasWidth = firstPageData?.canvasWidth || 800;
      const canvasHeight = firstPageData?.canvasHeight || 600;

      // Create PDF
      const pdf = new jsPDF({
        orientation: canvasHeight > canvasWidth ? 'portrait' : 'landscape',
        unit: 'px',
        format: [canvasWidth, canvasHeight]
      });

      // Add each page
      for (let i = 0; i < pageImages.length; i++) {
        if (i > 0) {
          pdf.addPage([canvasWidth, canvasHeight], canvasHeight > canvasWidth ? 'portrait' : 'landscape');
        }
        pdf.addImage(pageImages[i], 'PNG', 0, 0, canvasWidth, canvasHeight);
      }

      // Download PDF
      const fileName = `card-${card.id}-${Date.now()}.pdf`;
      pdf.save(fileName);

    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  if (loading || cardsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your cards...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white shadow-lg rounded-2xl p-8 text-center max-w-md w-full">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Sign in to view your cards</h2>
          <p className="text-gray-600 mb-6">Log in to see all cards you have published.</p>
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
            <h1 className="text-2xl font-bold text-gray-900">My Published Cards</h1>
            <p className="text-sm text-gray-600">Cards you have customized and published.</p>
          </div>
          <Link href="/e-card" className="text-primary font-semibold hover:underline">Create New</Link>
        </div>

        {cards.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-500">
            You have not published any cards yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map((card) => {
              const preview = Array.isArray(card.preview_urls) && card.preview_urls.length > 0
                ? card.preview_urls[0]
                : card.preview_url;

              const viewHref = card.category_slug && card.subcategory_slug
                ? `/e-card/${card.category_slug}/${card.subcategory_slug}/${card.public_slug}`
                : `/e-card/${card.public_slug}`;

              return (
                <div key={card.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="aspect-3/4 bg-gray-100 flex items-center justify-center">
                    {preview ? (
                      <img src={preview} alt="Card preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400 text-sm">No preview</span>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="text-sm text-gray-500">Published on {card.created_at ? new Date(card.created_at).toLocaleDateString() : '—'}</p>
                    <div className="flex flex-col gap-2">
                      {card.public_slug && (
                        <Link
                          href={viewHref}
                          className="flex-1 text-center px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
                        >
                          View
                        </Link>
                      )}
                      {preview ? (
                        <button
                          type="button"
                          onClick={() => handleDownload(card, preview)}
                          disabled={payingId === card.id}
                          className="flex-1 text-center px-3 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-semibold disabled:opacity-60"
                        >
                          {card.pricing_type === 'premium' && card.payment_status !== 'paid'
                            ? payingId === card.id
                              ? 'Processing...'
                              : 'Pay & Download'
                            : payingId === card.id
                              ? 'Opening...'
                              : 'Download'}
                        </button>
                      ) : (
                        <span className="flex-1 text-center px-3 py-2 rounded-lg bg-gray-100 text-gray-400 text-sm font-semibold">
                          No preview
                        </span>
                      )}
                    </div>
                    {/* PDF Download Button for Multipage Cards */}
                    {(() => {
                      const customizedData = typeof card.customized_data === 'string'
                        ? (() => { try { return JSON.parse(card.customized_data); } catch { return null; } })()
                        : card.customized_data;
                      const isMultipage = customizedData?.is_multipage && customizedData?.pages && customizedData.pages.length > 1;
                      return isMultipage ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(card)}
                          disabled={generatingPdfId === card.id}
                          className="w-full text-center px-3 py-2 rounded-lg border-2 border-[#d18b47] text-[#d18b47] text-sm font-semibold hover:bg-[#d18b47] hover:text-white transition disabled:opacity-60"
                        >
                          {generatingPdfId === card.id ? '📄 Generating PDF...' : '📄 Download PDF'}
                        </button>
                      ) : null;
                    })()}
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
