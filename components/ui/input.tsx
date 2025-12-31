import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  colorScheme?: 'purple' | 'green' | 'blue';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, colorScheme = 'purple', className = '', ...props }, ref) => {
    const ringColor = {
      purple: 'focus:ring-purple-500',
      green: 'focus:ring-green-500',
      blue: 'focus:ring-blue-500',
    }[colorScheme];

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={props.id} className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${ringColor} focus:border-transparent outline-none transition ${className}`}
          {...props}
        />
        {helperText && !error && (
          <p className="text-xs text-gray-500 mt-1">{helperText}</p>
        )}
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
