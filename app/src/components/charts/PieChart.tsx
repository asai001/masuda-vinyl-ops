"use client";

type PieSlice = {
  label: string;
  value: number;
  color?: string;
};

type PieChartProps = {
  data: PieSlice[];
  size?: number;
  strokeWidth?: number;
  showCenterLabel?: boolean;
  centerLabel?: string;
};

const defaultColors = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#f97316",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#22c55e",
];

const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => ({
  x: cx + r * Math.cos(angle),
  y: cy + r * Math.sin(angle),
});

const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
};

export default function PieChart({
  data,
  size = 220,
  strokeWidth = 0,
  showCenterLabel = false,
  centerLabel,
}: PieChartProps) {
  const total = data.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
  const radius = size / 2 - 8;
  const center = size / 2;

  if (!total) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        データなし
      </div>
    );
  }

  let currentAngle = -Math.PI / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
      {data.map((slice, index) => {
        const value = Math.max(slice.value, 0);
        if (value <= 0) {
          return null;
        }
        const angle = (value / total) * Math.PI * 2;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;
        const color = slice.color ?? defaultColors[index % defaultColors.length];
        return (
          <path
            key={`${slice.label}-${index}`}
            d={describeArc(center, center, radius, startAngle, endAngle)}
            fill={color}
            stroke={strokeWidth ? "#ffffff" : "none"}
            strokeWidth={strokeWidth}
          >
            <title>
              {slice.label}: {value}
            </title>
          </path>
        );
      })}
      {showCenterLabel ? (
        <text x={center} y={center} textAnchor="middle" dominantBaseline="middle" className="fill-gray-700 text-sm">
          {centerLabel ?? ""}
        </text>
      ) : null}
    </svg>
  );
}
