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
      gradient: 'from-rose-900 to-red-800',
      border: 'border-rose-500/50',
      icon: AlertCircle,
      iconColor: 'text-rose-400',
      glow: 'shadow-rose-500/20',
      pulse: count > 0,
    },
    AMBER: {
      gradient: 'from-amber-900 to-yellow-800',
      border: 'border-amber-500/50',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      glow: 'shadow-amber-500/20',
      pulse: false,
    },
    GREEN: {
      gradient: 'from-emerald-900 to-green-800',
      border: 'border-emerald-500/50',
      icon: CheckCircle,
      iconColor: 'text-emerald-400',
      glow: 'shadow-emerald-500/20',
      pulse: false,
    },
  };

  const { gradient, border, icon: Icon, iconColor, glow, pulse } = config[status];

  return (
    <Card
      className={`bg-gradient-to-br ${gradient} ${border} p-6 transition-all duration-300 hover:scale-105 ${glow} ${
        pulse ? 'animate-pulse' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className={`h-8 w-8 ${iconColor}`} />
        <div className="text-3xl font-bold text-white">{count}</div>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-slate-300">{description}</div>
      </div>
    </Card>
  );
}
