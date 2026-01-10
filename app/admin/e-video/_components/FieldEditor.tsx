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

const PRIMARY = '#d66e4b';

function Label({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-700">
          {children}
        </span>
        {hint ? (
          <span className="text-[11px] text-gray-500">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}

function IconWrap({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
      {children}
    </span>
  );
}

function TagIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 13l-7 7-11-11V2h7L20 13z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M7 7h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HashIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TypeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 6h16M4 12h10M4 18h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FieldEditor({ field, onChange, onRemove }: Props) {
  const showOptions = field.field_type === 'select';

  return (
    <div className="space-y-4">
      {/* Top grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Label */}
        <div className="space-y-1">
          <Label hint="Shown to user">Label</Label>
          <div className="relative">
            <IconWrap>
              <TagIcon />
            </IconWrap>
            <input
              value={field.label}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder="e.g. Your Name"
              className="w-full rounded-xl border bg-white pl-10 pr-3 py-2.5 text-sm text-gray-900 shadow-sm
                focus:outline-none"
              style={{ borderColor: 'rgba(0,0,0,0.10)' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = PRIMARY;
                e.currentTarget.style.boxShadow = `0 0 0 4px rgba(214,110,75,0.20)`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
              }}
            />
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1">
          <Label hint="Internal key">Name</Label>
          <div className="relative">
            <IconWrap>
              <HashIcon />
            </IconWrap>
            <input
              value={field.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. full_name"
              className="w-full rounded-xl border bg-white pl-10 pr-3 py-2.5 text-sm text-gray-900 shadow-sm
                focus:outline-none"
              style={{ borderColor: 'rgba(0,0,0,0.10)' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = PRIMARY;
                e.currentTarget.style.boxShadow = `0 0 0 4px rgba(214,110,75,0.20)`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
              }}
            />
          </div>
        </div>

        {/* Type */}
        <div className="space-y-1">
          <Label hint="Input type">Field Type</Label>
          <div className="relative">
            <IconWrap>
              <TypeIcon />
            </IconWrap>
            <select
              value={field.field_type}
              onChange={(e) =>
                onChange({ field_type: e.target.value as VideoInviteFieldType })
              }
              className="w-full rounded-xl border bg-white pl-10 pr-8 py-2.5 text-sm text-gray-900 shadow-sm
                focus:outline-none"
              style={{ borderColor: 'rgba(0,0,0,0.10)' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = PRIMARY;
                e.currentTarget.style.boxShadow = `0 0 0 4px rgba(214,110,75,0.20)`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
              }}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Options input */}
      {showOptions && (
        <div className="space-y-1">
          <Label hint="Comma separated">Select Options</Label>
          <input
            value={field.options}
            onChange={(e) => onChange({ options: e.target.value })}
            placeholder="Option A, Option B, Option C"
            className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm
              focus:outline-none"
            style={{ borderColor: 'rgba(0,0,0,0.10)' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = PRIMARY;
              e.currentTarget.style.boxShadow = `0 0 0 4px rgba(214,110,75,0.20)`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
            }}
          />
          <p className="text-[11px] text-gray-500">
            Example: <span className="font-medium">Male, Female, Other</span>
          </p>
        </div>
      )}

      {/* Required + Remove row */}
      <div className="flex items-center justify-between gap-4 pt-1">
        {/* Required Toggle */}
        <button
          type="button"
          onClick={() => onChange({ required: !field.required })}
          className="flex items-center gap-2 text-xs font-semibold text-gray-700"
        >
          <span
            className="inline-flex h-5 w-9 items-center rounded-full transition"
            style={{
              backgroundColor: field.required ? PRIMARY : 'rgba(0,0,0,0.15)',
              padding: '2px',
            }}
          >
            <span
              className="h-4 w-4 rounded-full bg-white shadow-sm transition"
              style={{
                transform: field.required ? 'translateX(16px)' : 'translateX(0px)',
              }}
            />
          </span>
          Required
        </button>

        {/* Remove */}
        <button
          type="button"
          onClick={onRemove}
          className="rounded-xl border px-3 py-1.5 text-xs font-semibold text-red-600 transition
            hover:bg-red-50 active:scale-[0.98]"
          style={{ borderColor: 'rgba(239,68,68,0.35)' }}
        >
          Remove Field
        </button>
      </div>
    </div>
  );
}
