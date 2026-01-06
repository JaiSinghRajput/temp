import axios from '@/lib/axios';

interface Color {
  id: number;
  name: string;
  hex_code: string;
}

export const colorService = {
  // Get all colors
  async getAll(): Promise<Color[]> {
    try {
      const res = await axios.get('/api/colors');
      return res.data.data || [];
    } catch (error) {
      console.error('Error fetching colors:', error);
      return [];
    }
  },

  // Get single color
  async getById(id: number): Promise<Color | null> {
    try {
      const res = await axios.get(`/api/colors/${id}`);
      return res.data.data || null;
    } catch (error) {
      console.error('Error fetching color:', error);
      return null;
    }
  },

  // Create color
  async create(name: string, hex_code: string): Promise<Color | null> {
    try {
      const res = await axios.post('/api/colors', { name, hex_code });
      return res.data.data || null;
    } catch (error) {
      console.error('Error creating color:', error);
      throw error;
    }
  },

  // Update color
  async update(id: number, name: string, hex_code: string): Promise<Color | null> {
    try {
      const res = await axios.put(`/api/colors/${id}`, { name, hex_code });
      return res.data.data || null;
    } catch (error) {
      console.error('Error updating color:', error);
      throw error;
    }
  },

  // Delete color
  async delete(id: number): Promise<boolean> {
    try {
      await axios.delete(`/api/colors/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting color:', error);
      throw error;
    }
  },
};

export default colorService;
