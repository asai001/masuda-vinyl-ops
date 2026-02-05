"use client";

import { useEffect, useMemo, useState } from "react";
import AggregationDashboard from "@/features/aggregation/AggregationDashboard";
import { fetchSalesOrderRows } from "@/features/sales-management/api/client";
import { calculateSalesMetrics } from "@/features/sales-management/salesManagementUtils";
import type { SalesRow } from "@/features/sales-management/types";
import { fetchExchangeRates } from "@/features/settings/api/client";
import type { ExchangeRates } from "@/features/settings/types";
import {
  DEFAULT_EXCHANGE_RATES,
  normalizeExchangeRates,
} from "@/features/aggregation/aggregationUtils";

export default function SalesAggregationView() {
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const fetched = await fetchSalesOrderRows();
        if (!cancelled) {
          setRows(fetched);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          const msg = error instanceof Error ? error.message : "Failed to load";
          setLoadError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const aggregationRows = useMemo(
    () =>
      rows.map((row) => {
        const metrics = calculateSalesMetrics(row.items);
        return {
          id: row.salesOrderId,
          date: row.orderDate,
          partner: row.customerName.trim(),
          currency: row.currency,
          amount: metrics.amount,
          confirmed: row.documentStatus.orderReceived,
        };
      }),
    [rows],
  );

  if (loading) {
    return <div className="text-sm text-gray-500">読み込み中...</div>;
  }

  if (loadError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        受注データの読み込みに失敗しました。{loadError}
      </div>
    );
  }

  return (
    <AggregationDashboard
      rows={aggregationRows}
      partnerLabel="顧客"
      dateLabel="受注日"
      confirmedLabel="受注書受領"
      exchangeRates={exchangeRates}
    />
  );
}
