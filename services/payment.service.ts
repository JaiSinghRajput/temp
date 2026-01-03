import axiosInstance from '@/lib/axios';

export const paymentService = {
  // Create Razorpay order
  async createOrder(data: { amount: number; currency?: string; receipt?: string; notes?: any }) {
    const response = await axiosInstance.post('/api/payments/razorpay/order', data);
    return response.data;
  },

  // Verify Razorpay payment
  async verifyPayment(data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    ecard_id: number;
  }) {
    const response = await axiosInstance.post('/api/payments/razorpay/verify', data);
    return response.data;
  },
};
