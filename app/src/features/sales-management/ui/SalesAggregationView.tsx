"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable, { type TableColumn } from "@/components/DataTable";
import AggregationDashboard, {
  type AggregationDashboardRenderContext,
} from "@/features/aggregation/AggregationDashboard";
import {
  DEFAULT_EXCHANGE_RATES,
  convertFromUsd,
  convertToUsd,
  formatCurrencyValue,
  formatNumberValue,
  isWithinRange,
  normalizeExchangeRates,
} from "@/features/aggregation/aggregationUtils";
import { fetchSalesOrderRows } from "@/features/sales-management/api/client";
import {
  buildShippedAmountEntries,
  collectItemShipments,
} from "@/features/sales-management/salesManagementUtils";
import type { SalesRow } from "@/features/sales-management/types";
import { fetchExchangeRates } from "@/features/settings/api/client";
import type { ExchangeRates } from "@/features/settings/types";

type ShipmentSummaryRow = {
  id: string;
  date: string;
  partner: string;
  orderNo: string;
  orderDate: string;
  productCode: string;
  productName: string;
  orderQuantity: number;
  shippedQuantity: number;
  unitPrice: number;
  amount: number;
  unpaidAmount: number;
  currency: string;
  confirmed: boolean;
};

const toDisplayCurrency = (
  amount: number,
  currency: string,
  displayCurrency: AggregationDashboardRenderContext["displayCurrency"],
  exchangeRates: ExchangeRates,
) => convertFromUsd(convertToUsd(amount, currency, exchangeRates), displayCurrency, exchangeRates);

const buildShipmentColumns = (
  context: AggregationDashboardRenderContext,
): TableColumn<ShipmentSummaryRow>[] => [
  {
    key: "date",
    header: "出荷日",
    render: (row) => <span className="text-sm">{row.date}</span>,
  },
  {
    key: "orderNo",
    header: "PO NO.",
    render: (row) => <span className="text-sm font-semibold text-blue-600">{row.orderNo}</span>,
  },
  {
    key: "orderDate",
    header: "受注日",
    render: (row) => <span className="text-sm">{row.orderDate}</span>,
  },
  {
    key: "partner",
    header: "顧客",
    render: (row) => <span className="text-sm font-semibold">{row.partner}</span>,
  },
  {
    key: "product",
    header: "品目/品番",
    render: (row) => (
      <div className="flex flex-col text-sm">
        <span className="font-semibold">{row.productCode}</span>
        <span className="text-gray-600">{row.productName}</span>
      </div>
    ),
  },
  {
    key: "orderQuantity",
    header: "注数",
    align: "right",
    render: (row) => <span className="text-sm">{formatNumberValue(row.orderQuantity)}</span>,
  },
  {
    key: "shippedQuantity",
    header: "出荷数",
    align: "right",
    render: (row) => <span className="text-sm font-semibold">{formatNumberValue(row.shippedQuantity)}</span>,
  },
  {
    key: "unitPrice",
    header: `単価 (${context.displayCurrency})`,
    align: "right",
    render: (row) => (
      <span className="text-sm">
        {formatCurrencyValue(
          context.displayCurrency,
          toDisplayCurrency(row.unitPrice, row.currency, context.displayCurrency, context.exchangeRates),
        )}
      </span>
    ),
  },
  {
    key: "amount",
    header: `売上金額 (${context.displayCurrency})`,
    align: "right",
    render: (row) => (
      <span className="text-sm font-semibold">
        {formatCurrencyValue(
          context.displayCurrency,
          toDisplayCurrency(row.amount, row.currency, context.displayCurrency, context.exchangeRates),
        )}
      </span>
    ),
  },
  {
    key: "unpaidAmount",
    header: `受注残金額 (${context.displayCurrency})`,
    align: "right",
    render: (row) => (
      <span className="text-sm font-semibold text-amber-700">
        {formatCurrencyValue(
          context.displayCurrency,
          toDisplayCurrency(row.unpaidAmount, row.currency, context.displayCurrency, context.exchangeRates),
        )}
      </span>
    ),
  },
];

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
      rows.flatMap((row) => {
        const shippedEntries = buildShippedAmountEntries(row.items, row.deliveryDate);
        const totalShippedAmount = shippedEntries.reduce((sum, entry) => sum + entry.amount, 0);
        const totalUnpaidAmount = Math.max(totalShippedAmount - row.paidAmount, 0);
        return shippedEntries.map((entry, index) => ({
          id: `${row.salesOrderId}-${index + 1}`,
          date: entry.date,
          partner: row.customerName.trim(),
          currency: row.currency,
          amount: entry.amount,
          unpaidAmount: totalShippedAmount > 0 ? (totalUnpaidAmount * entry.amount) / totalShippedAmount : 0,
          confirmed: row.documentStatus.orderReceived,
        }));
      }),
    [rows],
  );

  const shipmentSummaryRows = useMemo<ShipmentSummaryRow[]>(
    () =>
      rows.flatMap((row) => {
        const shippedEntries = buildShippedAmountEntries(row.items, row.deliveryDate);
        const totalShippedAmount = shippedEntries.reduce((sum, entry) => sum + entry.amount, 0);
        const totalUnpaidAmount = Math.max(totalShippedAmount - row.paidAmount, 0);

        return row.items.flatMap((item) =>
          collectItemShipments(item, row.deliveryDate).flatMap((shipment) => {
            const date = shipment.deliveryDate.trim();
            if (!date || shipment.shippedQuantity <= 0) {
              return [];
            }

            const amount = shipment.shippedQuantity * item.unitPrice;

            return [
              {
                id: `${row.salesOrderId}-${item.id}-${shipment.id}`,
                date,
                partner: row.customerName.trim(),
                orderNo: row.orderNo,
                orderDate: row.orderDate,
                productCode: item.productCode,
                productName: item.productName,
                orderQuantity: item.orderQuantity,
                shippedQuantity: shipment.shippedQuantity,
                unitPrice: item.unitPrice,
                amount,
                unpaidAmount: totalShippedAmount > 0 ? (totalUnpaidAmount * amount) / totalShippedAmount : 0,
                currency: row.currency,
                confirmed: row.documentStatus.orderReceived,
              },
            ];
          }),
        );
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
      dateLabel="出荷日"
      confirmedLabel="受注書受領"
      exchangeRates={exchangeRates}
      includeUnpaidAmount
      renderAdditionalSections={(context) => {
        const filteredShipmentRows = shipmentSummaryRows
          .filter((row) => {
            if (!row.confirmed) {
              return false;
            }
            if (!isWithinRange(row.date, context.startDate, context.endDate)) {
              return false;
            }
            if (context.selectedPartners.length && !context.selectedPartners.includes(row.partner)) {
              return false;
            }
            return true;
          })
          .sort((a, b) => {
            const dateResult = a.date.localeCompare(b.date);
            if (dateResult !== 0) {
              return dateResult;
            }
            const orderResult = a.orderNo.localeCompare(b.orderNo, "ja");
            if (orderResult !== 0) {
              return orderResult;
            }
            return a.id.localeCompare(b.id, "ja");
          });

        if (!filteredShipmentRows.length) {
          return null;
        }

        return (
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold text-gray-700">出荷明細サマリー</div>
            <DataTable
              columns={buildShipmentColumns(context)}
              rows={filteredShipmentRows}
              getRowId={(row) => row.id}
              enableHorizontalScroll
            />
          </div>
        );
      }}
    />
  );
}
