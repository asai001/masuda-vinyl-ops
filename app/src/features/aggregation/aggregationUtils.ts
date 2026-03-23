import type { CurrencyCode } from "@/constants/currency";
import type { ExchangeRates } from "@/features/settings/types";

export type GroupUnit = "day" | "week" | "month";

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  jpyPerUsd: 150,
  vndPerUsd: 25000,
};

const normalizeRate = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? value : fallback;

export const normalizeExchangeRates = (rates?: ExchangeRates): ExchangeRates => ({
  jpyPerUsd: normalizeRate(rates?.jpyPerUsd ?? DEFAULT_EXCHANGE_RATES.jpyPerUsd, DEFAULT_EXCHANGE_RATES.jpyPerUsd),
  vndPerUsd: normalizeRate(rates?.vndPerUsd ?? DEFAULT_EXCHANGE_RATES.vndPerUsd, DEFAULT_EXCHANGE_RATES.vndPerUsd),
  updatedAt: rates?.updatedAt,
});

const parseDateParts = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || month < 1 || month > 12 || day < 1) {
    return null;
  }
  return { year, month, day };
};

export const normalizeDateInputValue = (value: string) => {
  const parts = parseDateParts(value);
  if (!parts) {
    return value;
  }
  const lastDayOfMonth = new Date(parts.year, parts.month, 0).getDate();
  const normalizedDay = Math.min(parts.day, lastDayOfMonth);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(normalizedDay).padStart(2, "0")}`;
};

export const parseDateInput = (value: string): Date | null => {
  const normalizedValue = normalizeDateInputValue(value);
  const parts = parseDateParts(normalizedValue);
  if (!parts) {
    return null;
  }
  return new Date(parts.year, parts.month - 1, parts.day);
};

export const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getCurrentMonthRange = (baseDate: Date = new Date()) => {
  const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  return {
    startDate: formatDateInput(startDate),
    endDate: formatDateInput(baseDate),
  };
};

export const isWithinRange = (target: string, startDate: string, endDate: string) => {
  const targetDate = parseDateInput(target);
  if (!targetDate) {
    return false;
  }
  const start = startDate ? parseDateInput(startDate) : null;
  const end = endDate ? parseDateInput(endDate) : null;
  const targetTime = targetDate.getTime();
  const startTime = start ? start.getTime() : Number.NEGATIVE_INFINITY;
  const endTime = end ? end.getTime() : Number.POSITIVE_INFINITY;
  return targetTime >= startTime && targetTime <= endTime;
};

export const convertToUsd = (amount: number, currency: string, rates: ExchangeRates) => {
  const code = currency?.toUpperCase();
  if (code === "JPY") {
    return amount / rates.jpyPerUsd;
  }
  if (code === "VND") {
    return amount / rates.vndPerUsd;
  }
  return amount;
};

export const convertFromUsd = (amount: number, currency: CurrencyCode, rates: ExchangeRates) => {
  const code = currency?.toUpperCase();
  if (code === "JPY") {
    return amount * rates.jpyPerUsd;
  }
  if (code === "VND") {
    return amount * rates.vndPerUsd;
  }
  return amount;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-US");

export const formatCurrencyValue = (currency: string, value: number) =>
  `${currency} ${currencyFormatter.format(value)}`;

export const formatNumberValue = (value: number) => numberFormatter.format(value);

export const getPeriodGroup = (value: string, unit: GroupUnit) => {
  const date = parseDateInput(value);
  if (!date) {
    return null;
  }
  if (unit === "day") {
    const label = formatDateInput(date);
    return { key: label, label, sortKey: date.getTime() };
  }
  if (unit === "week") {
    const day = date.getDay();
    const diff = (day + 6) % 7;
    const start = new Date(date);
    start.setDate(date.getDate() - diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const label = `${formatDateInput(start)} 〜 ${formatDateInput(end)}`;
    return { key: formatDateInput(start), label, sortKey: start.getTime() };
  }
  const monthLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  return { key: monthLabel, label: monthLabel, sortKey: monthStart.getTime() };
};
