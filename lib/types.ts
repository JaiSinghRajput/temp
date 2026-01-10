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
  imageUrl: string;
  backgroundId: number;
  canvasData: CanvasData;
  cloudinaryPublicId: string;
  previewImageUrl: string;
  previewPublicId: string;
}

// NEW SCHEMA TYPES
export interface ContentItem {
  id: bigint;
  type: 'ecard' | 'video';
  title: string;
  slug: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ECardTemplate extends ContentItem {
  canvas_schema: CanvasData;
  is_multipage: boolean;
  pages: TemplatePage[];
  price: number;
  pricing_type: 'free' | 'premium';
}

export interface VideoTemplate extends ContentItem {
  preview_video_url: string;
  preview_video_public_id: string;
  preview_thumbnail_url: string;
  price: number;
}

export interface ContentAsset {
  id: bigint;
  content_id: bigint;
  asset_type: 'image' | 'video' | 'background' | 'font';
  cloudinary_public_id: string;
  url: string;
  metadata: any;
  created_at: string;
}

export interface Category {
  id: bigint;
  name: string;
  slug: string;
  parent_id: bigint;
  is_active: boolean;
}

export interface CategoryLink {
  category_id: bigint;
  target_type: 'content' | 'product';
  target_id: bigint;
}

export interface Product {
  id: bigint;
  content_id?: bigint;
  sku?: string;
  name?: string;
  type: 'physical' | 'digital';
  price: number;
  sale_price?: number;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: bigint;
  order_number: string;
  user_id?: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'refunded';
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  shipping_address?: any;
  billing_address?: any;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: bigint;
  order_id: bigint;
  product_id: bigint;
  price: number;
  quantity: number;
  created_at: string;
}

export interface Payment {
  id: bigint;
  order_id: bigint;
  provider?: string;
  provider_reference?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  created_at: string;
}

export interface Shipment {
  id: bigint;
  order_id: bigint;
  carrier?: string;
  tracking_number?: string;
  status: 'pending' | 'packed' | 'shipped' | 'delivered' | 'returned';
  shipped_at?: string;
  delivered_at?: string;
  created_at: string;
}

export interface UserCustomContent {
  id: bigint;
  content_id: bigint;
  user_id: string;
  custom_data: any;
  preview_url: string;
  status: 'draft' | 'submitted' | 'paid' | 'completed';
  created_at: string;
}

// Frontend Template Interface - mirrors new schema structure
export interface Template {
  id: number;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string;
  template_image_url: string;
  cloudinary_public_id: string;
  canvas_data: CanvasData;
  is_multipage: boolean;
  pages: TemplatePage[];
  is_active: boolean;
  category_id?: number | null;
  category_slug: string;
  category_name: string;
  subcategory_id?: number | null;
  subcategory_slug: string;
  subcategory_name: string;
  background_id: number;
  created_at: string;
  updated_at: string;
  pricing_type?: 'free' | 'premium';
  price?: number;
  color?: string | null;
  color_name?: string | null;
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
  user_id?: string | null;
  user_name?: string | null;
  customized_data: any;
  preview_url: string;
  preview_urls?: string[];
  public_slug?: string;
  created_at?: string;
  updated_at?: string;
  category_slug?: string | null;
  subcategory_slug?: string | null;
  payment_status?: 'pending' | 'paid' | null;
  payment_order_id?: string | null;
  payment_id?: string | null;
  payment_signature?: string | null;
  payment_amount?: number | null;
  pricing_type?: 'free' | 'premium';
  price?: number | null;
}

export interface VideoCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  status?: boolean | number;
}

export interface VideoSubcategory {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  status?: boolean | number;
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
  role: 'admin' | 'super_admin' | 'editor';
  created_at?: string;
  updated_at?: string;
}

export interface User {
  uid: string;
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

export interface AuthedUser {
  uid: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  role: string;
  id?: string;
}

export interface AuthPayload {
  id?: number;
  uid?: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  role: string;
}

export type VideoInviteFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'date'
  | 'select'
  | 'file'
  | 'url';

export interface VideoInviteField {
  id?: number;
  template_id: number;
  name: string;
  label: string;
  field_type: VideoInviteFieldType;
  required?: boolean;
  helper_text?: string | null;
  options?: string[] | null;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VideoInviteTemplate {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  preview_video_url: string;
  preview_video_public_id?: string | null;
  preview_thumbnail_url?: string | null;
  category_id?: number | null;
  subcategory_id?: number | null;
  category_name?: string | null;
  subcategory_name?: string | null;
  category_slug?: string | null;
  subcategory_slug?: string | null;
  is_active?: boolean;
  price?: number | null;
  cards?: VideoInviteCard[];
  created_at?: string;
  updated_at?: string;
}

export interface VideoInviteCard {
  id: number;
  template_id: number;
  card_image_url?: string | null;
  card_image_public_id?: string | null;
  sort_order?: number;
  fields?: VideoInviteField[];
  created_at?: string;
  updated_at?: string;
}

export interface VideoInviteRequest {
  id: number;
  template_id: number;
  card_id?: number | null;
  user_id?: string | null;
  requester_name: string;
  requester_email?: string | null;
  requester_phone?: string | null;
  payload: Record<string, any>;
  status: 'new' | 'in_progress' | 'done' | 'cancelled' | 'draft' | 'paid' | 'completed';
  admin_notes?: string | null;
  payment_status?: 'pending' | 'paid';
  payment_order_id?: string | null;
  payment_id?: string | null;
  payment_signature?: string | null;
  template_title?: string;
  template_slug?: string;
  template_category_slug?: string | null;
  template_subcategory_slug?: string | null;
  template_price?: number;
  template_pricing_type?: 'free' | 'premium';
  created_at?: string;
  updated_at?: string;
}
