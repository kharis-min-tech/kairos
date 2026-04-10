import type { ReactNode } from 'react';

interface StatCardProps {
  icon?: ReactNode;
  label: string;
  value: string | number;
  change?: { value: number; label?: string };
  className?: string;
}

function StatCard({ icon, label, value, change, className = '' }: StatCardProps) {
  const isPositive = change && change.value >= 0;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm text-gray-500 truncate">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          {change && (
            <p className={`mt-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{change.value}%{change.label ? ` ${change.label}` : ''}
            </p>
          )}
        </div>
        {icon && (
          <div className="shrink-0 ml-4 p-3 bg-purple-50 text-primary rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export { StatCard };
export type { StatCardProps };
