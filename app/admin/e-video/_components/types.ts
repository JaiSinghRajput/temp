// components/e-video/Types.ts
import { VideoInviteFieldType } from '@/lib/types';

export interface FieldDraft {
  name: string;
  label: string;
  field_type: VideoInviteFieldType;
  required: boolean;
  helper_text?: string;
  options?: string;
  sort_order: number;
}

export interface CardDraft {
  id: string;
  card_image_url: string;
  card_image_public_id?: string;
  sort_order: number;
  fields: FieldDraft[];
  uploading?: boolean;
}
