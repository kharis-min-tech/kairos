import React from 'react';
import { Modal, ModalProps } from '../Modal';
import { cn } from '../../utils';

export interface DialogProps extends Omit<ModalProps, 'className'> {
  title?: string;
  description?: string;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  title,
  description,
  children,
  className,
  ...modalProps
}) => {
  return (
    <Modal {...modalProps} size="sm" className={cn('max-w-md', className)}>
      <div className="p-6">
        {title && (
          <h3 className="text-lg font-medium text-neutral-900 mb-2">{title}</h3>
        )}
        {description && (
          <p className="text-sm text-neutral-500 mb-4">{description}</p>
        )}
        {children}
      </div>
    </Modal>
  );
};
