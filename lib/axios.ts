import axios from 'axios';

// Determine the base URL based on environment
const getBaseURL = () => {
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }
  // Client-side - use relative URLs so cookies work properly
  return '';
};

const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // CRITICAL: sends/receives cookies with every request
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

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Extract error data properly
    if (error.response?.data) {
      // Don't do hard redirect here - let the service/component handle auth errors
      return Promise.reject(error.response.data);
    }
    
    // For network errors or other issues
    return Promise.reject({
      success: false,
      message: error.message || 'An error occurred',
    });
  }
);

export default axiosInstance;
