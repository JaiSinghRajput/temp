"use client";
import Link from 'next/link';
import React from 'react';

type HeaderAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
};

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actions?: HeaderAction[];
  containerClass?: string; // allow page-specific container width
}

const variants: Record<NonNullable<HeaderAction['variant']>, string> = {
  primary: 'bg-primary hover:bg-primary/90 text-white',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
  ghost: 'text-gray-600 hover:text-gray-900',
};

export function AdminHeader({ title, subtitle, actions = [], containerClass = 'max-w-7xl' }: AdminHeaderProps) {
  return (
    <div className="bg-white shadow-md border-b h-14">
      <div className={`${containerClass} mx-auto px-4`}> 
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
            {subtitle && (
              <span className="hidden md:inline text-sm text-gray-600 truncate">{subtitle}</span>
            )}
          </div>
          {actions.length > 0 && (
            <div className="flex gap-2">
              {actions.map((a, i) => {
                const cls = a.variant ? variants[a.variant] : variants.ghost;
                const base = `h-9 px-3 rounded-md text-sm font-semibold transition flex items-center ${cls}`;
                return a.href ? (
                  <Link key={i} href={a.href} className={base}>
                    {a.label}
                  </Link>
                ) : (
                  <button key={i} onClick={a.onClick} className={base}>
                    {a.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
