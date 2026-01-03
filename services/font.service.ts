import axiosInstance from '@/lib/axios';

export const fontService = {
  // Get all font CDN links
  async getFonts() {
    const response = await axiosInstance.get('/api/font-cdn-links');
    return response.data;
  },

  // Create font CDN link
  async createFont(data: { font_name: string; cdn_link: string }) {
    const response = await axiosInstance.post('/api/font-cdn-links', data);
    return response.data;
  },

  // Update font CDN link
  async updateFont(id: number, data: { font_name: string; cdn_link: string }) {
    const response = await axiosInstance.put(`/api/font-cdn-links/${id}`, data);
    return response.data;
  },

  // Delete font CDN link
  async deleteFont(id: number) {
    const response = await axiosInstance.delete(`/api/font-cdn-links/${id}`);
    return response.data;
  },
};
