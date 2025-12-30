import { CustomFont } from './font-utils';

export type { CustomFont };

export interface TextElement {
  id: string;
  text: string;
  label: string;
  left: number;
  top: number;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  fill: string;
  width?: number;
  textAlign?: string;
  angle?: number;
  locked?: boolean;
}

export interface CanvasData {
  textElements: TextElement[];
  canvasWidth: number;
  canvasHeight: number;
  customFonts?: CustomFont[];
}

export interface Template {
  id: number;
  name: string;
  description: string;
  template_image_url: string;
  cloudinary_public_id?: string;
  canvas_data: CanvasData;
  thumbnail_uri?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  category_id?: number;
  subcategory_id?: number | null;
  category_name?: string;
  subcategory_name?: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UserEcard {
  id: number;
  template_id: number;
  user_name?: string | null;
  customized_data: any;
  preview_url: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string | null;
}

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  slug: string;
}
