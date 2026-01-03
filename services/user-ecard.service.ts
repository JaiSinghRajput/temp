import axiosInstance from '@/lib/axios';

export const userEcardService = {
  // Get user ecards
  async getUserEcards(userId: string) {
    const response = await axiosInstance.get(`/api/user-ecards`, {
      params: { user_id: userId },
      headers: { 'Cache-Control': 'no-cache' }
    });
    return response.data;
  },

  // Create user ecard
  async createUserEcard(data: {
    template_id: number;
    user_name?: string;
    user_id?: string;
    customized_data: any;
    preview_uri?: string;
    preview_urls?: string[];
  }) {
    const response = await axiosInstance.post('/api/user-ecards', data);
    return response.data;
  },
};
