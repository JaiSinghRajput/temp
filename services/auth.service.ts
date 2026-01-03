import axiosInstance from '@/lib/axios';

// Helper to safely extract error message from axios error
const getErrorMessage = (error: any): { success: false; message: string } => {
  // If error is already a properly formatted object
  if (error?.success === false && error?.message) {
    return error;
  }
  
  // Extract from various error formats
  const message = 
    error?.message || 
    error?.error || 
    error?.data?.message || 
    error?.data?.error ||
    'An error occurred. Please try again.';
    
  return { success: false, message };
};

export const authService = {
  // User Registration - Send OTP
  async sendRegistrationOtp(data: { phone: string; email?: string; first_name: string; last_name: string }) {
    try {
      const response = await axiosInstance.post('/api/auth/user/register', data);
      return response.data;
    } catch (error: any) {
      return getErrorMessage(error);
    }
  },

  // User Registration - Verify OTP
  async verifyRegistrationOtp(data: { otp: string; tempUserUid: string }) {
    try {
      const response = await axiosInstance.post('/api/auth/user/register', data);
      return response.data;
    } catch (error: any) {
      return getErrorMessage(error);
    }
  },

  // User Login - Request OTP
  async requestLoginOtp(phone: string) {
    try {
      const response = await axiosInstance.post('/api/auth/mobiletlogin', { phone });
      return response.data;
    } catch (error: any) {
      return getErrorMessage(error);
    }
  },

  // User Login - Verify OTP
  async verifyLoginOtp(data: { otp: string; uid: string }) {
    try {
      const response = await axiosInstance.post('/api/auth/mobiletlogin', data);
      return response.data;
    } catch (error: any) {
      return getErrorMessage(error);
    }
  },

  // Admin Login
  async adminLogin(data: { email: string; password: string }) {
    try {
      const response = await axiosInstance.post('/api/auth/adminslogin', data);
      return response.data;
    } catch (error: any) {
      return getErrorMessage(error);
    }
  },

  // Verify Auth Token
  async verifyToken() {
    try {
      const response = await axiosInstance.get('/api/auth/verify', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      return response.data;
    } catch (error: any) {
      return getErrorMessage(error);
    }
  },

  // Logout - Clear auth token
  async logout() {
    try {
      const response = await axiosInstance.post('/api/auth/logout', {}, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      return response.data;
    } catch (error: any) {
      return getErrorMessage(error);
    }
  },
};
