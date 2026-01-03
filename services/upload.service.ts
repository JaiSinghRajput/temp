import axiosInstance from '@/lib/axios';

export const uploadService = {
  // Get background by ID
  async getBackground(backgroundId: string) {
    const response = await axiosInstance.get(`/api/uploads/background/${backgroundId}`);
    return response.data;
  },

  // Upload background
  async uploadBackground(data: FormData) {
    const response = await axiosInstance.post('/api/uploads/background', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Upload to Cloudinary
  async uploadToCloudinary(data: FormData, folder?: string) {
    const url = folder ? `/api/uploads/cloudinary?folder=${encodeURIComponent(folder)}` : '/api/uploads/cloudinary';
    const response = await axiosInstance.post(url, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Delete from Cloudinary
  async deleteFromCloudinary(publicId: string, folder?: string) {
    const url = `/api/uploads/cloudinary/${encodeURIComponent(publicId)}${folder ? `?folder=${encodeURIComponent(folder)}` : ''}`;
    const response = await axiosInstance.delete(url);
    return response.data;
  },
};
