import axios from 'axios';

// Determine the base URL based on environment
const getBaseURL = () => {
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  return '';
};

const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    if (status === 401 && url.includes('/api/auth/verify')) {
      return Promise.resolve({
        data: { success: false, message: 'Not authenticated' },
        status,
        statusText: error.response?.statusText || 'Unauthorized',
        headers: error.response?.headers || {},
        config: error.config,
      });
    }

    if (error.response?.data) {
      const errorData = {
        ...error.response.data,
        status,
      };
      return Promise.reject(errorData);
    }
    

    return Promise.reject({
      success: false,
      message: error.message || 'An error occurred',
    });
  }
);

export default axiosInstance;
