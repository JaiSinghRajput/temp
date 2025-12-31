import React from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  label?: string;
  helperText?: string;
  colorScheme?: 'purple' | 'green' | 'blue';
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  length = 6,
  label = 'Enter 6-Digit OTP',
  helperText = 'Valid for 5 minutes',
  colorScheme = 'purple',
}) => {
  const ringColor = {
    purple: 'focus:ring-purple-500',
    green: 'focus:ring-green-500',
    blue: 'focus:ring-blue-500',
  }[colorScheme];

  const formatOtp = (inputValue: string) => {
    const numbers = inputValue.replace(/\D/g, '').slice(0, length);
    onChange(numbers);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => formatOtp(e.target.value)}
        placeholder="0"
        maxLength={length}
        className={`w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg ${ringColor} focus:border-transparent outline-none transition`}
      />
      {helperText && (
        <p className="text-xs text-gray-500 mt-1 text-center">{helperText}</p>
      )}
    </div>
  );
};
