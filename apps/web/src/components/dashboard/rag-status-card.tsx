'use client';

import { Card } from '@kairos/ui';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';

interface RAGStatusCardProps {
  status: 'RED' | 'AMBER' | 'GREEN';
  count: number;
  label: string;
  description: string;
}

export function RAGStatusCard({ status, count, label, description }: RAGStatusCardProps) {
  const config = {
    RED: {
      icon: AlertCircle,
      iconColor: 'text-destructive/70',
    },
    AMBER: {
      icon: AlertTriangle,
      iconColor: 'text-accent/70',
    },
    GREEN: {
      icon: CheckCircle,
      iconColor: 'text-success/70',
    },
  };

  const { icon: Icon, iconColor } = config[status];

  return (
    <Card className="bg-card rounded p-6 shadow-ambient hover:shadow-ambient-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <Icon className={`h-8 w-8 ${iconColor}`} />
        <div className="text-3xl font-semibold text-foreground tracking-tight">{count}</div>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </Card>
  );
}
