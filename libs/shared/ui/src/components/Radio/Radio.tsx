import React from 'react';
import { cn } from '../../utils';

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  helperText?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, id, ...props }, ref) => {
    const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex items-center">
        <input
          ref={ref}
          id={radioId}
          type="radio"
          className={cn(
            // Base styles
            'h-4 w-4 border-neutral-300 text-primary-600',
            'focus:ring-primary-500 focus:ring-2 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {label && (
          <label
            htmlFor={radioId}
            className={cn(
              'ml-3 text-sm font-medium text-neutral-700',
              props.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  label,
  error,
  helperText,
  orientation = 'vertical',
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="text-sm font-medium text-neutral-700 mb-2">{label}</div>
      )}
      <div
        className={cn(
          'space-y-2',
          orientation === 'horizontal' && 'flex space-x-4 space-y-0'
        )}
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            disabled={option.disabled}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
          />
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-sm text-neutral-500">{helperText}</p>
      )}
    </div>
  );
};
