import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type ColorOption = {
  label: string;
  value: string;
};

interface ColorSelectProps {
  options: ColorOption[];
  value: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
  allLabel?: string;
  className?: string;
  selectClassName?: string;
}

export function ColorSelect({
  options,
  value,
  onChange,
  includeAll = false,
  allLabel = 'All colors',
  className,
  selectClassName,
}: ColorSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const swatch = value !== 'all' ? value : '#ffffff';
  const displayLabel =
    value === 'all' && includeAll ? allLabel : options.find((o) => o.value === value)?.label || value;

  const allOption = includeAll ? [{ label: allLabel, value: 'all' } as ColorOption] : [];
  const renderedOptions = [...allOption, ...options];

  return (
    <div className={cn('relative', className)} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
          selectClassName
        )}
      >
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: swatch }} />
          <span>{displayLabel}</span>
        </span>
        <span className="text-gray-400 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <ul className="max-h-64 overflow-auto py-2">
            {renderedOptions.map((opt) => {
              const isActive = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-gray-50',
                      isActive ? 'bg-blue-50 text-blue-800' : 'text-gray-800'
                    )}
                  >
                    <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: opt.value !== 'all' ? opt.value : '#ffffff' }} />
                    <span>{opt.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
