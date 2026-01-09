'use client';

import { CardDraft } from './types';
import { CardImageUploader } from './CardImageUploader';
import { FieldAccordion } from './FieldAccordion';

interface Props {
  card: CardDraft;
  onUpdate: (patch: Partial<CardDraft>) => void;
  onAddField: () => void;
  onUpdateField: (index: number, patch: any) => void;
  onRemoveField: (index: number) => void;
}

export function CardEditor({
  card,
  onUpdate,
  onAddField,
  onUpdateField,
  onRemoveField,
}: Props) {
  return (
    <section className="space-y-6">
      <CardImageUploader
        imageUrl={card.card_image_url}
        onChange={(url, pid) =>
          onUpdate({ card_image_url: url, card_image_public_id: pid })
        }
        className="h-40"
      />

      <div>
        <label className="text-sm text-gray-600">Sort Order</label>
        <input
          type="number"
          value={card.sort_order}
          onChange={(e) =>
            onUpdate({ sort_order: Number(e.target.value) })
          }
          className="input"
        />
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Fields</h3>
        <button
          onClick={onAddField}
          className="text-sm border rounded-md px-3 py-1"
        >
          + Add Field
        </button>
      </div>

      <FieldAccordion
        fields={card.fields}
        onUpdate={onUpdateField}
        onRemove={onRemoveField}
      />
    </section>
  );
}
