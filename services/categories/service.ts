import axiosInstance from '@/lib/axios';

export const CardcategoryService = {
  // Get all categories
  async getCardCategories() {
    const response = await axiosInstance.get('/api/categories/card/categories');
    return response.data;
  },

  // Create card category
  async createCardCategory(data: { name: string; slug?: string }) {
    const response = await axiosInstance.post('/api/categories/card/categories', data);
    return response.data;
  },

  // Delete card category
  async deleteCardCategory(id: number) {
    const response = await axiosInstance.delete(`/api/categories/card/categories/${id}`);
    return response.data;
  },

  // Get card subcategories
  async getCardSubcategories(categoryId?: number) {
    const params = categoryId ? { category_id: categoryId } : undefined;
    const response = await axiosInstance.get('/api/categories/card/subcategories', { params });
    return response.data;
  },

  // Create card subcategory
  async createCardSubcategory(data: { name: string; category_id: number; slug?: string }) {
    const response = await axiosInstance.post('/api/categories/card/subcategories', data);
    return response.data;
  },

  // Delete card subcategory
  async deleteCardSubcategory(id: number) {
    const response = await axiosInstance.delete(`/api/categories/card/subcategories/${id}`);
    return response.data;
  },
};

// video

export const VideocategoryService = {
  // Get all categories
  async getVideoCategories() {
    const response = await axiosInstance.get('/api/categories/video/categories');
    return response.data;
  },

  // Create card category
  async createVideoCategory(data: { name: string; slug?: string }) {
    const response = await axiosInstance.post('/api/categories/video/categories', data);
    return response.data;
  },

  // Delete video category
  async deleteVideoCategory(id: number) {
    const response = await axiosInstance.delete(`/api/categories/video/categories/${id}`);
    return response.data;
  },

  // Get video subcategories
  async getVideoSubcategories(categoryId?: number) {
    const params = categoryId ? { category_id: categoryId } : undefined;
    const response = await axiosInstance.get('/api/categories/video/subcategories', { params });
    return response.data;
  },

  // Create video subcategory
  async createVideoSubcategory(data: { name: string; category_id: number; slug?: string }) {
    const response = await axiosInstance.post('/api/categories/video/subcategories', data);
    return response.data;
  },

  // Delete video subcategory
  async deleteVideoSubcategory(id: number) {
    const response = await axiosInstance.delete(`/api/categories/video/subcategories/${id}`);
    return response.data;
  },
};
// dresses
export const DresscategoryService = {
  // Get all categories
  async getDressCategories() {
    const response = await axiosInstance.get('/api/categories/dresses/categories');
    return response.data;
  },

  // Create dress category
  async createDressCategory(data: { name: string; slug?: string }) {
    const response = await axiosInstance.post('/api/categories/dresses/categories', data);
    return response.data;
  },

  // Delete dress category
  async deleteDressCategory(id: number) {
    const response = await axiosInstance.delete(`/api/categories/dresses/categories/${id}`);
    return response.data;
  },

  // Get dress subcategories
  async getDressSubcategories(categoryId?: number) {
    const params = categoryId ? { category_id: categoryId } : undefined;
    const response = await axiosInstance.get('/api/categories/dresses/subcategories', { params });
    return response.data;
  },

  // Create dress subcategory
  async createDressSubcategory(data: { name: string; category_id: number; slug?: string }) {
    const response = await axiosInstance.post('/api/categories/dresses/subcategories', data);
    return response.data;
  },

  // Delete dress subcategory
  async deleteDressSubcategory(id: number) {
    const response = await axiosInstance.delete(`/api/categories/dresses/subcategories/${id}`);
    return response.data;
  },
};
// gifts
export const GiftcategoryService = {
  // Get all categories
  async getGiftCategories() {
    const response = await axiosInstance.get('/api/categories/gifts/categories');
    return response.data;
  },

  // Create gift category
  async createGiftCategory(data: { name: string; slug?: string }) {
    const response = await axiosInstance.post('/api/categories/gifts/categories', data);
    return response.data;
  },

  // Delete gift category
  async deleteGiftCategory(id: number) {
    const response = await axiosInstance.delete(`/api/categories/gifts/categories/${id}`);
    return response.data;
  },

  // Get gift subcategories
  async getGiftSubcategories(categoryId?: number) {
    const params = categoryId ? { category_id: categoryId } : undefined;
    const response = await axiosInstance.get('/api/categories/gifts/subcategories', { params });
    return response.data;
  },

  // Create gift subcategory
  async createGiftSubcategory(data: { name: string; category_id: number; slug?: string }) {
    const response = await axiosInstance.post('/api/categories/gifts/subcategories', data);
    return response.data;
  },

  // Delete gift subcategory
  async deleteGiftSubcategory(id: number) {
    const response = await axiosInstance.delete(`/api/categories/gifts/subcategories/${id}`);
    return response.data;
  },
};
