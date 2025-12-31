export type EditorMode = 'create' | 'edit';

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

export interface PageData {
  imageUrl: string;
  publicId: string | null;
  canvasData: {
    textElements: TextElement[];
    canvasWidth: number;
    canvasHeight: number;
  };
}

export interface TemplatePayload {
  name: string;
  description: string;
  category_id: number;
  subcategory_id: number | null;
  pricing_type: 'free' | 'premium';
  price: number;
  is_multipage: boolean;
  template_image_url: string;
  cloudinary_public_id: string | null;
  canvas_data: any;
}
