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
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          `
        w-full flex items-center justify-between gap-3
        px-3 py-1.5 rounded-lg
        border border-gray-200
        bg-[#fcfcfb]
        text-sm text-gray-900
        shadow-sm
        transition
        hover:border-gray-300
        focus:outline-none focus:ring-1 focus:ring-[#d18b47]/40
        `,
          selectClassName
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            className="w-4 h-4 rounded-full border border-gray-300 shrink-0"
            style={{ backgroundColor: swatch }}
          />
          <span className="truncate">{displayLabel}</span>
        </span>

        <span
          className={cn(
            'text-gray-400 text-xs transition-transform',
            open && 'rotate-180'
          )}
        >
          ▾
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="
          absolute z-30 mt-2 w-full
          rounded-xl
          border border-gray-200
          bg-[#fcfcfb]
          shadow-[0_10px_30px_rgba(0,0,0,0.08)]
        "
        >
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
                      `
                    group w-full flex items-center gap-3
                    px-3 py-2 text-sm text-left
                    transition
                    `,
                      isActive
                        ? 'bg-[#d18b47]/10 text-[#d18b47] font-medium'
                        : 'text-gray-800 hover:bg-gray-100'
                    )}
                  >
                    {/* Swatch */}
                    <span
                      className={cn(
                        'w-4 h-4 rounded-full border border-gray-300',
                        isActive && 'ring-2 ring-[#d18b47]/40'
                      )}
                      style={{
                        backgroundColor:
                          opt.value !== 'all' ? opt.value : '#ffffff',
                      }}
                    />

                    {/* Label */}
                    <span className="truncate">{opt.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  )

}
