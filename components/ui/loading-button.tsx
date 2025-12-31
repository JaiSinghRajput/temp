import React from 'react';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  colorScheme?: 'purple' | 'green' | 'blue' | 'red';
  children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText = 'Loading...',
  colorScheme = 'purple',
  children,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      disabled={loading || disabled}
      className={`w-full bg-[#c29958] hover:bg-[#b38647] disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <span className="animate-spin mr-2">⌛</span>
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
};
