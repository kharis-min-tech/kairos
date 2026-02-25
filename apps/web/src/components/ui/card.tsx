import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className}`} {...props}>
      {children}
    </div>
  );
}

function CardBody({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`px-6 py-4 border-t border-gray-200 ${className}`} {...props}>
      {children}
    </div>
  );
}

export { Card, CardHeader, CardBody, CardFooter };
export type { CardProps };
