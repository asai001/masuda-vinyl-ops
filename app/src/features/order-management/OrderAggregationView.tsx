"use client";

import { useEffect, useMemo, useState } from "react";
import AggregationDashboard from "@/features/aggregation/AggregationDashboard";
import { fetchPurchaseOrderRows } from "@/features/order-management/api/client";
import type { OrderRow } from "@/features/order-management/types";
import { fetchExchangeRates } from "@/features/settings/api/client";
import type { ExchangeRates } from "@/features/settings/types";
import {
  DEFAULT_EXCHANGE_RATES,
  normalizeExchangeRates,
} from "@/features/aggregation/aggregationUtils";

export default function OrderAggregationView() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const fetched = await fetchPurchaseOrderRows();
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
      rows.map((row) => ({
        id: row.purchaseOrderId,
        date: row.orderDate,
        partner: row.supplier.trim(),
        currency: row.currency,
        amount: row.amount,
        confirmed: row.documentStatus.orderSent,
      })),
    [rows],
  );

  if (loading) {
    return <div className="text-sm text-gray-500">読み込み中...</div>;
  }

  if (loadError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        発注データの読み込みに失敗しました。{loadError}
      </div>
    );
  }

  return (
    <AggregationDashboard
      rows={aggregationRows}
      partnerLabel="仕入先"
      dateLabel="発注日"
      confirmedLabel="発注書発行"
      exchangeRates={exchangeRates}
    />
  );
}
