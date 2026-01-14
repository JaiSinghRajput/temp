import axiosInstance from "@/lib/axios";

export type ProductImage = {
  id: number;
  product_id: number;
  image_url: string;
  cloudinary_public_id?: string | null;
  is_primary: number;
  sort_order: number;
  created_at?: string;
};

export const productImagesService = {
  async getImages(product_id: number | string) {
    const response = await axiosInstance.get("/api/admin/products/images", {
      params: { product_id },
    });
    return response.data as { success: boolean; data: ProductImage[] };
  },

  async addImage(data: {
    product_id: number | string;
    image_url: string;
    cloudinary_public_id?: string | null;
    is_primary?: boolean;
    sort_order?: number;
  }) {
    const response = await axiosInstance.post("/api/admin/products/images", data);
    return response.data as { success: boolean; image_id: number };
  },

  async updateImage(data: {
    id: number;
    product_id: number | string;
    image_url?: string;
    is_primary?: boolean;
    sort_order?: number;
  }) {
    const response = await axiosInstance.put("/api/admin/products/images", data);
    return response.data as { success: boolean };
  },

  async deleteImage(id: number) {
    const response = await axiosInstance.delete("/api/admin/products/images", {
      params: { id },
    });
    return response.data as { success: boolean };
  },
};
