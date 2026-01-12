'use client';

import { FieldDraft } from './types';
import { FieldEditor } from './FieldEditor';

interface Props {
  fields: FieldDraft[];
  onUpdate: (index: number, patch: Partial<FieldDraft>) => void;
  onRemove: (index: number) => void;
}

const PRIMARY = '#d66e4b';

function ChevronDownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FieldAccordion({ fields, onUpdate, onRemove }: Props) {
  return (
    <div className="space-y-3">
      {fields.map((field, i) => (
        <details
          key={i}
          className="group rounded-2xl border bg-white shadow-sm overflow-hidden transition"
          style={{ borderColor: 'rgba(0,0,0,0.10)' }}
        >
          {/* Header */}
          <summary
            className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-4 select-none
              hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Left accent dot */}
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: PRIMARY }}
              />

              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {field.label || `Field ${i + 1}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Field type pill */}
              <span
                className="hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  backgroundColor: 'rgba(214,110,75,0.12)',
                  color: PRIMARY,
                }}
              >
                {field.field_type}
              </span>

              {/* Chevron */}
              <span
                className="flex h-8 w-8 items-center justify-center rounded-xl border text-gray-500 transition
                  group-open:rotate-180"
                style={{
                  borderColor: 'rgba(0,0,0,0.10)',
                }}
              >
                <ChevronDownIcon />
              </span>
            </div>
          </summary>

          {/* Open highlight line */}
          <div
            className="h-px w-full opacity-0 group-open:opacity-100 transition"
            style={{ backgroundColor: 'rgba(214,110,75,0.35)' }}
          />

          {/* Body */}
          <div className="p-4 bg-white">
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: 'rgba(0,0,0,0.08)',
                background: 'linear-gradient(180deg, rgba(214,110,75,0.06), rgba(255,255,255,0))',
              }}
            >
              <FieldEditor
                field={field}
                onChange={(patch) => onUpdate(i, patch)}
                onRemove={() => onRemove(i)}
              />
            </div>
          </div>
        </details>
      ))}

      {/* Empty state */}
      {fields.length === 0 && (
        <div
          className="rounded-2xl border bg-white p-6 text-center shadow-sm"
          style={{ borderColor: 'rgba(0,0,0,0.10)' }}
        >
          <p className="text-sm font-semibold text-gray-900">No fields added yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Click “Add Field” to create your first editable layer.
          </p>
        </div>
      )}
    </div>
  );
}
