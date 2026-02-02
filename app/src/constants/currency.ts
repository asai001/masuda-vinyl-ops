export const CURRENCY_OPTIONS = ["USD", "VND", "JPY"] as const;

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number];

export const CURRENCY_OPTION_ITEMS = CURRENCY_OPTIONS.map((currency) => ({
  value: currency,
  label: currency,
}));
