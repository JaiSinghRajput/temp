// components/e-video/utils.ts
import { CardDraft, FieldDraft } from './types';

export function createEmptyCard(index: number): CardDraft {
  return {
    id: `card-${index + 1}`,
    card_image_url: '',
    sort_order: index,
    fields: [],
  };
}

export function createEmptyField(index: number): FieldDraft {
  return {
    name: `field_${index + 1}`,
    label: 'Field label',
    field_type: 'text',
    required: true,
    helper_text: '',
    options: '',
    sort_order: index,
  };
}
