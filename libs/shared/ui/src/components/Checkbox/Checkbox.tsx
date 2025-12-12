import React from 'react';
import { cn } from '../../utils';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const checkboxId =
      id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              ref={ref}
              id={checkboxId}
              type="checkbox"
              className={cn(
                // Base styles
                'h-4 w-4 rounded border-neutral-300 text-primary-600',
                'focus:ring-primary-500 focus:ring-2 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                // Error state
                error && 'border-error-300 focus:ring-error-500',
                className
              )}
              {...props}
            />
          </div>
          {label && (
            <div className="ml-3 text-sm">
              <label
                htmlFor={checkboxId}
                className={cn(
                  'font-medium text-neutral-700',
                  props.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {label}
              </label>
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-neutral-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
