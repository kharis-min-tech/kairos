'use client';

import { toast as sonnerToast } from 'sonner';

/**
 * Toast hook wrapper for sonner
 * Provides a consistent API for showing toast notifications
 */
export function useToast() {
  return {
    toast: (options: {
      title?: string;
      description?: string;
      variant?: 'default' | 'destructive';
    }) => {
      const message = options.title || options.description || '';
      
      if (options.variant === 'destructive') {
        sonnerToast.error(message, {
          description: options.description && options.title ? options.description : undefined,
        });
      } else {
        sonnerToast.success(message, {
          description: options.description && options.title ? options.description : undefined,
        });
      }
    },
  };
}
