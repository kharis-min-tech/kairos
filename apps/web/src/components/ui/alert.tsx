'use client';

import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import type { HTMLAttributes } from 'react';

type AlertVariant = 'success' | 'warning' | 'error' | 'info';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  onDismiss?: () => void;
}

const variantStyles: Record<AlertVariant, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const icons: Record<AlertVariant, React.ReactNode> = {
  success: <CheckCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  error: <XCircle size={20} />,
  info: <Info size={20} />,
};

function Alert({ variant = 'info', title, onDismiss, children, className = '', ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-lg border p-4 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      <span className="shrink-0 mt-0.5">{icons[variant]}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? 'mt-1 text-sm' : 'text-sm'}>{children}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 p-1 rounded hover:bg-black/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export { Alert };
export type { AlertProps, AlertVariant };
