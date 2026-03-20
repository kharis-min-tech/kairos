'use client';

interface AttendanceChartProps {
  data: Array<{ week: string; percentage: number }>;
  height?: number;
}

const PADDING = { top: 20, right: 16, bottom: 32, left: 40 };

export function AttendanceChart({ data, height = 200 }: AttendanceChartProps) {
  if (!data.length) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">No attendance data available</p>
    );
  }

  const width = 100; // percentage-based via viewBox
  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const maxY = Math.max(100, ...data.map((d) => d.percentage));
  const yScale = (v: number) => PADDING.top + chartH - (v / maxY) * chartH;
  const xScale = (i: number) =>
    PADDING.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.percentage)}`).join(' ');
  const areaPoints = `${xScale(0)},${yScale(0)} ${points} ${xScale(data.length - 1)},${yScale(0)}`;

  // Y-axis ticks
  const yTicks = [0, 25, 50, 75, 100].filter((t) => t <= maxY);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
      role="img"
      aria-label={`Attendance trend chart showing ${data.length} weeks of data`}
    >
      <title>Attendance trend chart</title>
      {/* Grid lines */}
      {yTicks.map((t) => (
        <line
          key={t}
          x1={PADDING.left}
          y1={yScale(t)}
          x2={width - PADDING.right}
          y2={yScale(t)}
          stroke="#e5e7eb"
          strokeWidth={0.3}
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((t) => (
        <text
          key={`label-${t}`}
          x={PADDING.left - 3}
          y={yScale(t) + 1.5}
          textAnchor="end"
          fontSize={4}
          fill="#6b7280"
        >
          {t}%
        </text>
      ))}

      {/* Area fill */}
      <polygon points={areaPoints} fill="rgba(124,58,237,0.1)" />

      {/* Line */}
      <polyline points={points} fill="none" stroke="#7c3aed" strokeWidth={0.8} />

      {/* Data points */}
      {data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(d.percentage)} r={1.2} fill="#7c3aed" />
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => (
        <text
          key={`x-${i}`}
          x={xScale(i)}
          y={height - 8}
          textAnchor="middle"
          fontSize={3.2}
          fill="#6b7280"
        >
          {d.week}
        </text>
      ))}
    </svg>
  );
}
