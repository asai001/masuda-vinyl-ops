export const FONT_SCALE_VALUES = [0.9, 1, 1.1] as const;
export type FontScaleValue = (typeof FONT_SCALE_VALUES)[number];

export const DEFAULT_FONT_SCALE: FontScaleValue = 1;
export const FONT_SCALE_STORAGE_KEY = "mvops:font-scale";

export const FONT_SCALE_OPTIONS: { value: FontScaleValue; label: string }[] = [
  { value: 0.9, label: "小" },
  { value: 1, label: "標準" },
  { value: 1.1, label: "大" },
];

export const normalizeFontScale = (value: unknown): FontScaleValue => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_FONT_SCALE;
  }
  return FONT_SCALE_VALUES.includes(parsed as FontScaleValue) ? (parsed as FontScaleValue) : DEFAULT_FONT_SCALE;
};

export const isValidFontScale = (value: unknown): value is FontScaleValue => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && FONT_SCALE_VALUES.includes(parsed as FontScaleValue);
};

