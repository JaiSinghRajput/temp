import axiosInstance from '@/lib/axios';

export const templateService = {
  // Get all templates
  async getTemplates(params?: { category_id?: number; subcategory_id?: number; category_slug?: string; subcategory_slug?: string }) {
    const response = await axiosInstance.get('/api/templates', { params });
    return response.data;
  },

  // Get template by ID
  async getTemplateById(id: string | number) {
    const response = await axiosInstance.get(`/api/templates/${id}`);
    return response.data;
  },

  // Create template
  async createTemplate(data: any) {
    const response = await axiosInstance.post('/api/templates', data);
    return response.data;
  },

  // Update template
  async updateTemplate(id: string | number, data: any) {
    const response = await axiosInstance.put(`/api/templates/${id}`, data);
    return response.data;
  },

  // Delete template
  async deleteTemplate(id: string | number) {
    const response = await axiosInstance.delete(`/api/templates/${id}`);
    return response.data;
  },
};
