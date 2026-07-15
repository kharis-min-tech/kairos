import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
>;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            'peer h-5 w-5 appearance-none rounded-md border border-input/25 bg-background shadow-sm transition-colors',
            'checked:border-[#5D3FD3] checked:bg-[#5D3FD3]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f8b537]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:border-white/20 dark:bg-white/[0.04] dark:checked:border-[#5D3FD3] dark:checked:bg-[#5D3FD3]',
            className,
          )}
          {...props}
        />
        <Check
          aria-hidden="true"
          strokeWidth={3}
          className="pointer-events-none absolute h-3.5 w-3.5 text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100 dark:text-white"
        />
      </span>
    );
  },
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
