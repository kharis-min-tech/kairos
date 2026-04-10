'use client';

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const baseInputStyles = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2 disabled:bg-gray-50 disabled:text-gray-500 min-h-[44px]';
const labelStyles = 'block text-sm font-medium text-gray-700 mb-1';
const errorStyles = 'mt-1 text-sm text-red-600';

// --- Text Input ---
interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className={className}>
        {label && <label htmlFor={inputId} className={labelStyles}>{label}</label>}
        <input
          ref={ref}
          id={inputId}
          className={`${baseInputStyles} ${error ? 'border-red-500' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && <p id={`${inputId}-error`} className={errorStyles}>{error}</p>}
      </div>
    );
  }
);
TextInput.displayName = 'TextInput';

// --- Select ---
interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ label, error, id, options, placeholder, className = '', ...props }, ref) => {
    const selectId = id || props.name;
    return (
      <div className={className}>
        {label && <label htmlFor={selectId} className={labelStyles}>{label}</label>}
        <select
          ref={ref}
          id={selectId}
          className={`${baseInputStyles} ${error ? 'border-red-500' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p id={`${selectId}-error`} className={errorStyles}>{error}</p>}
      </div>
    );
  }
);
SelectInput.displayName = 'SelectInput';

// --- Checkbox ---
interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className = '', ...props }, ref) => {
    const checkboxId = id || props.name;
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className="h-4 w-4 rounded border-gray-300 text-primary focus-visible:ring-2 focus-visible:ring-purple-700 min-h-[44px] min-w-[44px] cursor-pointer"
          {...props}
        />
        <label htmlFor={checkboxId} className="text-sm text-gray-700 cursor-pointer">{label}</label>
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

// --- Radio ---
interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, id, className = '', ...props }, ref) => {
    const radioId = id || `${props.name}-${props.value}`;
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <input
          ref={ref}
          type="radio"
          id={radioId}
          className="h-4 w-4 border-gray-300 text-primary focus-visible:ring-2 focus-visible:ring-purple-700 min-h-[44px] min-w-[44px] cursor-pointer"
          {...props}
        />
        <label htmlFor={radioId} className="text-sm text-gray-700 cursor-pointer">{label}</label>
      </div>
    );
  }
);
Radio.displayName = 'Radio';

// --- Textarea ---
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const textareaId = id || props.name;
    return (
      <div className={className}>
        {label && <label htmlFor={textareaId} className={labelStyles}>{label}</label>}
        <textarea
          ref={ref}
          id={textareaId}
          className={`${baseInputStyles} min-h-[80px] ${error ? 'border-red-500' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          {...props}
        />
        {error && <p id={`${textareaId}-error`} className={errorStyles}>{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// --- Date Picker (native) ---
interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const dateId = id || props.name;
    return (
      <div className={className}>
        {label && <label htmlFor={dateId} className={labelStyles}>{label}</label>}
        <input
          ref={ref}
          type="date"
          id={dateId}
          className={`${baseInputStyles} ${error ? 'border-red-500' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${dateId}-error` : undefined}
          {...props}
        />
        {error && <p id={`${dateId}-error`} className={errorStyles}>{error}</p>}
      </div>
    );
  }
);
DatePicker.displayName = 'DatePicker';

export { TextInput, SelectInput, Checkbox, Radio, Textarea, DatePicker };
export type { TextInputProps, SelectInputProps, CheckboxProps, RadioProps, TextareaProps, DatePickerProps };
