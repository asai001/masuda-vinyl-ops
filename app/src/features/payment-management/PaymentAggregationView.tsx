"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AggregationDashboard from "@/features/aggregation/AggregationDashboard";
import { fetchPaymentManagementRows } from "@/features/payment-management/api/client";
import type { PaymentManagementRow } from "@/features/payment-management/types";
import { fetchExchangeRates } from "@/features/settings/api/client";
import type { ExchangeRates } from "@/features/settings/types";
import {
  DEFAULT_EXCHANGE_RATES,
  getCurrentMonthRange,
  normalizeExchangeRates,
  parseDateInput,
} from "@/features/aggregation/aggregationUtils";

const toMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const getMonthKeys = (startDate: string, endDate: string) => {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  if (!start || !end) {
    return [];
  }
  let startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  let endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  if (startMonth > endMonth) {
    [startMonth, endMonth] = [endMonth, startMonth];
  }
  const months: string[] = [];
  const cursor = new Date(startMonth);
  while (cursor <= endMonth) {
    months.push(toMonthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
};

export default function PaymentAggregationView() {
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [range, setRange] = useState(defaultRange);
  const [rows, setRows] = useState<PaymentManagementRow[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const handleRangeChange = useCallback((startDate: string, endDate: string) => {
    setRange((prev) =>
      prev.startDate === startDate && prev.endDate === endDate ? prev : { startDate, endDate },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fetched = await fetchExchangeRates();
        if (!cancelled) {
          setExchangeRates(normalizeExchangeRates(fetched));
        }
      } catch (error) {
        console.error("Failed to load exchange rates", error);
        if (!cancelled) {
          setExchangeRates(normalizeExchangeRates());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const months = getMonthKeys(range.startDate, range.endDate);
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    if (!months.length) {
      setRows([]);
      setLoading(false);
      setLoadError(null);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const fetched = await Promise.all(months.map((month) => fetchPaymentManagementRows(month)));
        if (requestIdRef.current !== requestId) {
          return;
        }
        setRows(fetched.flat());
      } catch (error) {
        console.error(error);
        if (requestIdRef.current !== requestId) {
          return;
        }
        const msg = error instanceof Error ? error.message : "Failed to load";
        setLoadError(msg);
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    })();
  }, [range.endDate, range.startDate]);

  const aggregationRows = useMemo(
    () =>
      rows.map((row) => ({
        id: row.paymentId,
        date: row.paymentDate,
        partner: row.category?.trim() || "未設定",
        currency: row.currency,
        amount: row.amount,
        confirmed: true,
      })),
    [rows],
  );

  return (
    <div className="flex flex-col gap-4">
      {loadError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          支払い集計の取得に失敗しました。{loadError}
        </div>
      ) : null}
      {loading ? <div className="text-sm text-gray-500">読み込み中...</div> : null}
      <AggregationDashboard
        rows={aggregationRows}
        partnerLabel="カテゴリ"
        dateLabel="支払日"
        confirmedLabel="支払済み/未払い"
        exchangeRates={exchangeRates}
        initialStartDate={defaultRange.startDate}
        initialEndDate={defaultRange.endDate}
        onDateRangeChange={handleRangeChange}
        scopeNotes={["集計対象: 支払済み・未払い", "期間基準: 支払日", "換算レート: 集計時点"]}
      />
    </div>
  );
}
