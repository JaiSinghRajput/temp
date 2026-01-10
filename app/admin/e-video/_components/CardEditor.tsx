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

const PRIMARY = '#d66e4b';

export function CardEditor({
  card,
  onUpdate,
  onAddField,
  onUpdateField,
  onRemoveField,
}: Props) {
  return (
    <section className="space-y-6">
      {/* Image uploader */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Card Image</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload the primary card preview image.
          </p>
        </div>
        <div className="grid gap-4 p-4 grid-cols-3">
          <CardImageUploader
            imageUrl={card.card_image_url}
            onChange={(url, pid) =>
              onUpdate({ card_image_url: url, card_image_public_id: pid })
            }
            className="rounded-xl col-span-2"
          />
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm col-span-1">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Sorting</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Lower number appears earlier.
              </p>
            </div>

            <div className="p-4">
              <label className="text-sm font-medium text-gray-700">
                Sort Order
              </label>
              <div className="mt-2 relative">
                <input
                  type="number"
                  value={card.sort_order}
                  onChange={(e) =>
                    onUpdate({ sort_order: Number(e.target.value) })
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm
                focus:outline-none focus:ring-2"
                  style={{
                    borderColor: 'rgba(0,0,0,0.08)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = PRIMARY;
                    e.currentTarget.style.boxShadow = `0 0 0 3px rgba(214,110,75,0.25)`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                  }}
                />
              </div>
            </div>
            
          </div>
        </div>
      </div>
      {/* Fields Header */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Fields</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage all editable text layers / fields inside this card.
            </p>
          </div>

          <button
            onClick={onAddField}
            className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-white shadow-sm transition
              hover:opacity-95 active:scale-[0.98]"
            style={{
              backgroundColor: PRIMARY,
              boxShadow: '0 10px 20px rgba(214,110,75,0.25)',
            }}
          >
            <span className="text-base leading-none">+</span>
            Add Field
          </button>
        </div>

        {/* Field list */}
        <div className="p-4">
          <div
            className="rounded-xl border bg-gray-50/60 p-3"
            style={{ borderColor: 'rgba(0,0,0,0.08)' }}
          >
            <FieldAccordion
              fields={card.fields}
              onUpdate={onUpdateField}
              onRemove={onRemoveField}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
