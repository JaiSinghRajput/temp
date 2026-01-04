import axiosInstance from '@/lib/axios';

export const paymentService = {
  // Create Razorpay order for e-card
  async createOrder(data: { amount: number; currency?: string; receipt?: string; notes?: any }) {
    const response = await axiosInstance.post('/api/payments/razorpay/order', data);
    return response.data;
  },

  // Verify Razorpay payment for e-card
  async verifyPayment(data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    ecard_id: number;
  }) {
    const response = await axiosInstance.post('/api/payments/razorpay/verify', data);
    return response.data;
  },

  // Create Razorpay order for video request
  async createVideoOrder(data: { 
    amount: number; 
    template_id: number;
    request_id?: number;
    currency?: string; 
    receipt?: string; 
    notes?: any;
  }) {
    const response = await axiosInstance.post('/api/payments/razorpay/video-order', data);
    return response.data;
  },

  // Verify Razorpay payment for video request
  async verifyVideoPayment(data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    request_id: number;
  }) {
    const response = await axiosInstance.post('/api/payments/razorpay/video-verify', data);
    return response.data;
  },
};
