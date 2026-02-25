'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-purple-800 focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2',
  secondary: 'bg-white text-primary border border-primary hover:bg-purple-50 focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2',
  danger: 'bg-highlight text-white hover:bg-red-900 focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[44px] min-w-[44px]',
  md: 'px-4 py-2 text-sm min-h-[44px] min-w-[44px]',
  lg: 'px-6 py-3 text-base min-h-[48px] min-w-[48px]',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors
          ${variantStyles[variant]} ${sizeStyles[size]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
