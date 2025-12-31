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
  scaleX?: number;
  scaleY?: number;
  locked?: boolean;
}

export interface CanvasData {
  textElements: TextElement[];
  canvasWidth: number;
  canvasHeight: number;
  customFonts?: CustomFont[];
}

export interface TemplatePage {
  imageUrl?: string;
  backgroundId?: number;
  canvasData: CanvasData;
  cloudinaryPublicId?: string;
}

export interface Template {
  id: number;
  name: string;
  description: string;
  template_image_url: string;
  background_id?: number;
  cloudinary_public_id?: string;
  canvas_data: CanvasData;
  // Multi-page support
  is_multipage?: boolean;
  pages?: TemplatePage[];
  thumbnail_uri?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  category_id?: number;
  subcategory_id?: number | null;
  category_name?: string;
  subcategory_name?: string | null;
}

export interface BackgroundAsset {
  id: number;
  cloudinary_public_id: string;
  cloudinary_url: string;
  image_hash: string;
  width: number;
  height: number;
  file_size?: number;
  usage_count?: number;
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
  preview_urls?: string[]; // Multi-page support
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string | null;
}

export interface FontCdnLink {
  id: number;
  font_name: string;
  cdn_link: string;
}

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  slug: string;
}

export interface Admin {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'super_admin';
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  phone: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  otp?: string;
  otp_expires_at?: Date;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthPayload {
  id: number;
  name: string;
  email?: string | null;
  mobile?: string | null;
  role: string;
}
