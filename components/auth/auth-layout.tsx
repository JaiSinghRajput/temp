import React from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  gradient?: 'purple' | 'green' | 'blue';
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
  gradient = 'purple',
}) => {
  const gradientColors = {
    purple: 'from-purple-50 to-indigo-100',
    green: 'from-green-50 to-emerald-100',
    blue: 'from-blue-50 to-indigo-100',
  }[gradient];

  return (
    <div className={`min-h-screen bg-linear-to-br ${gradientColors} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          {subtitle && <p className="text-gray-600">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
};
