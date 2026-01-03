'use client';

import { FieldDraft } from './types';
import { VideoInviteFieldType } from '@/lib/types';

const FIELD_TYPES: VideoInviteFieldType[] = [
  'text',
  'textarea',
  'email',
  'phone',
  'date',
  'select',
  'file',
  'url',
];

interface Props {
  field: FieldDraft;
  onChange: (patch: Partial<FieldDraft>) => void;
  onRemove: () => void;
}

export function FieldEditor({ field, onChange, onRemove }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <input
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Label"
          className="input"
        />
        <input
          value={field.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Name"
          className="input"
        />
        <select
          value={field.field_type}
          onChange={(e) =>
            onChange({ field_type: e.target.value as VideoInviteFieldType })
          }
          className="input"
        >
          {FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {field.field_type === 'select' && (
        <input
          value={field.options}
          onChange={(e) => onChange({ options: e.target.value })}
          placeholder="Option A, Option B"
          className="input"
        />
      )}

      <div className="flex justify-between">
        <label className="text-xs">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onChange({ required: e.target.checked })}
          />{' '}
          Required
        </label>

        <button
          onClick={onRemove}
          className="text-xs text-red-600"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
