'use client';

import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
];

interface ChartWrapperProps {
  height?: number;
  className?: string;
}

/* ── Bar Chart ────────────────────────────────────────── */

interface BarChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface SimpleBarChartProps extends ChartWrapperProps {
  data: BarChartData[];
  dataKey?: string;
  color?: string;
  showGrid?: boolean;
}

export function SimpleBarChart({
  data,
  dataKey = 'value',
  color = 'hsl(var(--primary))',
  showGrid = true,
  height = 250,
  className,
}: SimpleBarChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Line Chart ───────────────────────────────────────── */

interface LineChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface SimpleLineChartProps extends ChartWrapperProps {
  data: LineChartData[];
  dataKey?: string;
  color?: string;
  showGrid?: boolean;
  showDots?: boolean;
}

export function SimpleLineChart({
  data,
  dataKey = 'value',
  color = 'hsl(var(--primary))',
  showGrid = true,
  showDots = true,
  height = 250,
  className,
}: SimpleLineChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
          <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={showDots}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Donut / Pie Chart ────────────────────────────────── */

interface DonutChartData {
  name: string;
  value: number;
}

interface DonutChartProps extends ChartWrapperProps {
  data: DonutChartData[];
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
}

export function DonutChart({
  data,
  colors = CHART_COLORS,
  innerRadius = 60,
  outerRadius = 85,
  height = 250,
  className,
}: DonutChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 13,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
