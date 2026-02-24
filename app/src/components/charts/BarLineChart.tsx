"use client";

import { useMemo } from "react";

type TrendPoint = {
  label: string;
  value: number;
};

type BarLineChartProps = {
  data: TrendPoint[];
  height?: number;
  barColor?: string;
  lineColor?: string;
  unitLabel?: string;
};

const numberFormatter = new Intl.NumberFormat("en-US");

const formatNumber = (value: number) => numberFormatter.format(value);

export default function BarLineChart({
  data,
  height = 240,
  barColor = "#93c5fd",
  lineColor = "#1d4ed8",
  unitLabel,
}: BarLineChartProps) {
  const width = 600;
  const padding = { top: 24, right: 24, bottom: 48, left: 48 };
  const maxValue = Math.max(...data.map((item) => item.value), 0);
  const safeMax = maxValue === 0 ? 1 : maxValue;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = useMemo(() => {
    if (!data.length) {
      return [];
    }
    const step = chartWidth / data.length;
    return data.map((item, index) => {
      const x = padding.left + step * index + step / 2;
      const barHeight = (item.value / safeMax) * chartHeight;
      const y = padding.top + (chartHeight - barHeight);
      return { ...item, x, y, barHeight };
    });
  }, [chartHeight, chartWidth, data, padding.left, padding.top, safeMax]);

  const path = useMemo(() => {
    if (!points.length) {
      return "";
    }
    return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  }, [points]);

  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, idx) => (safeMax / yTicks) * idx);

  const labelStep = data.length > 12 ? 2 : 1;

  if (!data.length) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">データなし</div>
    );
  }

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <rect x={0} y={0} width={width} height={height} fill="white" />
      {yTickValues.map((value, index) => {
        const y = padding.top + chartHeight - (value / safeMax) * chartHeight;
        return (
          <g key={`grid-${index}`}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            <text
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-gray-400 text-xs"
            >
              {formatNumber(value)}
            </text>
          </g>
        );
      })}

      {points.map((point, index) => {
        const barWidth = Math.max(chartWidth / data.length - 12, 4);
        return (
          <g key={`bar-${index}`}>
            <rect
              x={point.x - barWidth / 2}
              y={point.y}
              width={barWidth}
              height={point.barHeight}
              fill={barColor}
              rx={4}
            >
              <title>
                {point.label}: {formatNumber(point.value)}
              </title>
            </rect>
          </g>
        );
      })}

      <path d={path} fill="none" stroke={lineColor} strokeWidth={2.5} />
      {points.map((point, index) => (
        <circle key={`dot-${index}`} cx={point.x} cy={point.y} r={3.5} fill={lineColor} />
      ))}

      {data.map((item, index) => {
        if (index % labelStep !== 0) {
          return null;
        }
        const step = chartWidth / data.length;
        const x = padding.left + step * index + step / 2;
        return (
          <text key={`label-${item.label}`} x={x} y={height - 16} textAnchor="middle" className="fill-gray-500 text-xs">
            {item.label}
          </text>
        );
      })}

      {unitLabel ? (
        <text x={padding.left} y={18} className="fill-gray-500 text-xs">
          {unitLabel}
        </text>
      ) : null}
    </svg>
  );
}
