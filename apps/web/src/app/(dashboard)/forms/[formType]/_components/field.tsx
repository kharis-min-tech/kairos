'use client';

import { Label, cn } from '@kairos/ui';

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

export function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      {required ? <span className="ml-0.5 text-destructive">*</span> : null}
    </Label>
  );
}

interface RadioOption {
  value: string;
  label: string;
}

/**
 * A small radio-group composed locally (no native <select>; the design system
 * has no radio primitive). Pill-style options matching Modern Sanctuary.
 */
export function RadioRow({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const checked = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              checked
                ? 'border-[#5D3FD3] bg-[#5D3FD3]/10 text-[#5D3FD3]'
                : 'border-input/15 text-muted-foreground hover:bg-foreground/5',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
