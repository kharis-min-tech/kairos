import React from 'react';
import { cn } from '../../utils';

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  error?: string;
}

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  required?: boolean;
}

export interface FormErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export interface FormHelperTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <form ref={ref} className={cn('space-y-6', className)} {...props}>
        {children}
      </form>
    );
  }
);

Form.displayName = 'Form';

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {children}
        {error && <FormError>{error}</FormError>}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, children, required, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn('block text-sm font-medium text-neutral-700', className)}
        {...props}
      >
        {children}
        {required && <span className="text-error-500 ml-1">*</span>}
      </label>
    );
  }
);

FormLabel.displayName = 'FormLabel';

export const FormError = React.forwardRef<HTMLParagraphElement, FormErrorProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-error-600', className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);

FormError.displayName = 'FormError';

export const FormHelperText = React.forwardRef<
  HTMLParagraphElement,
  FormHelperTextProps
>(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-sm text-neutral-500', className)}
      {...props}
    >
      {children}
    </p>
  );
});

FormHelperText.displayName = 'FormHelperText';
