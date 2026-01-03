'use client';

import { FieldDraft } from './types';
import { FieldEditor } from './FieldEditor';

interface Props {
  fields: FieldDraft[];
  onUpdate: (index: number, patch: Partial<FieldDraft>) => void;
  onRemove: (index: number) => void;
}

export function FieldAccordion({
  fields,
  onUpdate,
  onRemove,
}: Props) {
  return (
    <div className="space-y-2">
      {fields.map((field, i) => (
        <details
          key={i}
          className="border rounded-lg bg-white"
        >
          <summary className="cursor-pointer px-4 py-2 flex justify-between">
            <span className="text-sm font-medium">
              {field.label || `Field ${i + 1}`}
            </span>
            <span className="text-xs text-gray-500">
              {field.field_type}
            </span>
          </summary>

          <div className="border-t p-4">
            <FieldEditor
              field={field}
              onChange={(patch) => onUpdate(i, patch)}
              onRemove={() => onRemove(i)}
            />
          </div>
        </details>
      ))}
    </div>
  );
}
