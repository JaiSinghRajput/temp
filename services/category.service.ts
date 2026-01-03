import axiosInstance from '@/lib/axios';

export const categoryService = {
  // Get all categories
  async getCategories() {
    const response = await axiosInstance.get('/api/categories');
    return response.data;
  },

  // Create category
  async createCategory(data: { name: string; slug?: string }) {
    const response = await axiosInstance.post('/api/categories', data);
    return response.data;
  },

  // Delete category
  async deleteCategory(id: number) {
    const response = await axiosInstance.delete(`/api/categories/${id}`);
    return response.data;
  },

  // Get all subcategories
  async getSubcategories(categoryId?: number) {
    const params = categoryId ? { category_id: categoryId } : undefined;
    const response = await axiosInstance.get('/api/subcategories', { params });
    return response.data;
  },

  // Create subcategory
  async createSubcategory(data: { name: string; category_id: number; slug?: string }) {
    const response = await axiosInstance.post('/api/subcategories', data);
    return response.data;
  },

  // Delete subcategory
  async deleteSubcategory(id: number) {
    const response = await axiosInstance.delete(`/api/subcategories/${id}`);
    return response.data;
  },
};
