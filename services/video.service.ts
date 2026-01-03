import axiosInstance from '@/lib/axios';

export const videoService = {
  // Get all video templates
  async getVideoTemplates(params?: { category_id?: number; subcategory_id?: number; category_slug?: string; subcategory_slug?: string }) {
    const response = await axiosInstance.get('/api/e-video/templates', { params });
    return response.data;
  },

  // Get video template by slug
  async getVideoTemplateBySlug(slug: string) {
    const response = await axiosInstance.get(`/api/e-video/templates/${slug}`, {
      headers: { 'Cache-Control': 'no-store' }
    });
    return response.data;
  },

  // Create video template
  async createVideoTemplate(data: any) {
    const response = await axiosInstance.post('/api/e-video/templates', data);
    return response.data;
  },

  // Update video template
  async updateVideoTemplate(data: any) {
    const response = await axiosInstance.put('/api/e-video/templates', data);
    return response.data;
  },

  // Get video categories
  async getVideoCategories() {
    const response = await axiosInstance.get('/api/video-categories');
    return response.data;
  },

  // Create video category
  async createVideoCategory(data: { name: string; slug?: string }) {
    const response = await axiosInstance.post('/api/video-categories', data);
    return response.data;
  },

  // Delete video category
  async deleteVideoCategory(id: number) {
    const response = await axiosInstance.delete(`/api/video-categories/${id}`);
    return response.data;
  },

  // Get video subcategories
  async getVideoSubcategories(categoryId?: number) {
    const params = categoryId ? { category_id: categoryId } : undefined;
    const response = await axiosInstance.get('/api/video-subcategories', { params });
    return response.data;
  },

  // Create video subcategory
  async createVideoSubcategory(data: { name: string; category_id: number; slug?: string }) {
    const response = await axiosInstance.post('/api/video-subcategories', data);
    return response.data;
  },

  // Delete video subcategory
  async deleteVideoSubcategory(id: number) {
    const response = await axiosInstance.delete(`/api/video-subcategories/${id}`);
    return response.data;
  },

  // Get video requests
  async getVideoRequests(params?: { status?: string; templateId?: string; cardId?: string }) {
    const response = await axiosInstance.get('/api/e-video/requests', { params });
    return response.data;
  },

  // Create video request
  async createVideoRequest(data: {
    template_id: number;
    card_id?: number;
    user_id?: string;
    requester_name: string;
    requester_email?: string;
    requester_phone?: string;
    payload: Record<string, any>;
  }) {
    const response = await axiosInstance.post('/api/e-video/requests', data);
    return response.data;
  },
};
