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

  const slices = data.reduce<
    Array<{
      label: string;
      value: number;
      color: string;
      startAngle: number;
      endAngle: number;
    }>
  >((acc, slice, index) => {
    const value = Math.max(slice.value, 0);
    if (value <= 0) {
      return acc;
    }
    const angle = (value / total) * Math.PI * 2;
    const startAngle = acc.length ? acc[acc.length - 1].endAngle : -Math.PI / 2;
    const endAngle = startAngle + angle;
    const color = slice.color ?? defaultColors[index % defaultColors.length];
    return [...acc, { label: slice.label, value, color, startAngle, endAngle }];
  }, []);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
      {slices.map((slice, index) => {
        return (
          <path
            key={`${slice.label}-${index}`}
            d={describeArc(center, center, radius, slice.startAngle, slice.endAngle)}
            fill={slice.color}
            stroke={strokeWidth ? "#ffffff" : "none"}
            strokeWidth={strokeWidth}
          >
            <title>
              {slice.label}: {slice.value}
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
