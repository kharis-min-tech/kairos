import React, { useEffect } from 'react';
import { cn } from '../../utils';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

const drawerPositions = {
  left: 'left-0 top-0 h-full',
  right: 'right-0 top-0 h-full',
  top: 'top-0 left-0 w-full',
  bottom: 'bottom-0 left-0 w-full',
};

const drawerSizes = {
  sm: {
    left: 'w-64',
    right: 'w-64',
    top: 'h-64',
    bottom: 'h-64',
  },
  md: {
    left: 'w-80',
    right: 'w-80',
    top: 'h-80',
    bottom: 'h-80',
  },
  lg: {
    left: 'w-96',
    right: 'w-96',
    top: 'h-96',
    bottom: 'h-96',
  },
};

const drawerTransforms = {
  left: {
    closed: '-translate-x-full',
    open: 'translate-x-0',
  },
  right: {
    closed: 'translate-x-full',
    open: 'translate-x-0',
  },
  top: {
    closed: '-translate-y-full',
    open: 'translate-y-0',
  },
  bottom: {
    closed: 'translate-y-full',
    open: 'translate-y-0',
  },
};

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  children,
  position = 'right',
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
}) => {
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closeOnEscape]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-opacity duration-300',
        isOpen
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black transition-opacity duration-300',
          isOpen ? 'bg-opacity-50' : 'bg-opacity-0'
        )}
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed bg-white shadow-xl transition-transform duration-300 ease-in-out',
          drawerPositions[position],
          drawerSizes[size][position],
          isOpen
            ? drawerTransforms[position].open
            : drawerTransforms[position].closed,
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};
