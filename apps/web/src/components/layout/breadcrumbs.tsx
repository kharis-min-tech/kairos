'use client';

import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1 text-sm text-gray-500">
        <li>
          <a href="/dashboard" className="flex items-center hover:text-primary" aria-label="Home">
            <Home size={14} />
          </a>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              <ChevronRight size={14} className="text-gray-300" aria-hidden="true" />
              {isLast || !item.href ? (
                <span className={isLast ? 'font-medium text-gray-900' : ''} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              ) : (
                <a href={item.href} className="hover:text-primary">
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
