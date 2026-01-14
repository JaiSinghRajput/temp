import axiosInstance from "@/lib/axios";
import { Product } from "@/lib/types";

// ADMIN PRODUCTS
const getAllProducts = async (params?: { q?: string; status?: string; page?: number; limit?: number }) => {
  const response = await axiosInstance.get("/api/admin/products/physical", { params });
  return response.data; // { success, page, limit, total, data }
};

const getProductById = async (id: string) => {
  const response = await axiosInstance.get(`/api/admin/products/physical/${id}`);
  return response.data; // { success, data }
};

const createProduct = async (productData: Partial<Product>) => {
  const response = await axiosInstance.post("/api/admin/products/physical", productData);
  return response.data; // { success, product_id, slug }
};

const updateProduct = async (id: string, productData: Partial<Product>) => {
  const response = await axiosInstance.put(`/api/admin/products/physical/${id}`, productData);
  return response.data; // { success, data }
};

const deleteProduct = async (id: string) => {
  const response = await axiosInstance.delete(`/api/admin/products/physical/${id}`);
  return response.data;
};

// USER PRODUCTS
const getAvailableProducts = async () => {
  const response = await axiosInstance.get("/api/products");
  return response.data;
};

export const productsService = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};

export const userProductsService = {
  getAvailableProducts,
};
