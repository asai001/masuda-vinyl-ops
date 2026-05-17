"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Checkbox, ListItemText, MenuItem, Paper, Select, TextField } from "@mui/material";
import BarLineChart from "@/components/charts/BarLineChart";
import DataTable, { type TableColumn } from "@/components/DataTable";
import PieChart from "@/components/charts/PieChart";
import { CURRENCY_OPTION_ITEMS, type CurrencyCode } from "@/constants/currency";
import {
  DEFAULT_EXCHANGE_RATES,
  convertFromUsd,
  convertToUsd,
  formatCurrencyValue,
  formatDateInput,
  formatNumberValue,
  getCurrentMonthRange,
  getPeriodGroup,
  isWithinRange,
  normalizeExchangeRates,
  parseDateInput,
  type GroupUnit,
} from "@/features/aggregation/aggregationUtils";
import { fetchSalesOrderRows } from "@/features/sales-management/api/client";
import {
  buildPaidAmountEntries,
  calculateSalesSnapshot,
  getShipmentAmount,
} from "@/features/sales-management/salesManagementUtils";
import type { SalesRow } from "@/features/sales-management/types";
import { fetchExchangeRates } from "@/features/settings/api/client";
import type { ExchangeRates } from "@/features/settings/types";
import { useLanguage } from "@/lib/i18n/language";

type AggregationMode = "performance" | "balance";
type PerformanceTab = "period" | "partner" | "order" | "shipment" | "payment";
type ChartPoint = { label: string; value: number };
type ChartSlice = { label: string; value: number; color: string };

type ShipmentActivityRow = {
  id: string;
  salesOrderId: string;
  date: string;
  partner: string;
  orderNo: string;
  orderDate: string;
  amount: number;
  currency: string;
};

type ShipmentDetailRow = {
  id: string;
  salesOrderId: string;
  date: string;
  partner: string;
  orderNo: string;
  orderDate: string;
  productCode: string;
  productName: string;
  orderQuantity: number;
  shippedQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  orderAmount: number;
  amount: number;
  receivableBalance: number;
  unshippedAmount: number;
  currency: string;
};

type PaymentDetailRow = {
  id: string;
  salesOrderId: string;
  date: string;
  partner: string;
  orderNo: string;
  orderDate: string;
  amount: number;
  currency: string;
};

type OrderPerformanceRow = {
  id: string;
  salesOrderId: string;
  orderNo: string;
  orderDate: string;
  partner: string;
  currency: string;
  amount: number;
};

type OrderBalanceRow = {
  id: string;
  salesOrderId: string;
  orderNo: string;
  orderDate: string;
  partner: string;
  currency: string;
  amount: number;
  shippedAmount: number;
  paidAmount: number;
  orderBalance: number;
  receivableBalance: number;
  unshippedAmount: number;
};

type PeriodBucket = {
  key: string;
  label: string;
  sortKey: number;
  startDate: string;
  endDate: string;
};

type PerformancePeriodSummaryRow = {
  id: string;
  period: string;
  partnerCount: number;
  orderCount: number;
  orderAmount: number;
  shipmentCount: number;
  shipmentAmount: number;
  paymentCount: number;
  paymentAmount: number;
};

type PerformancePartnerSummaryRow = {
  id: string;
  partner: string;
  orderCount: number;
  orderAmount: number;
  shipmentCount: number;
  shipmentAmount: number;
  paymentCount: number;
  paymentAmount: number;
};

type BalancePeriodSummaryRow = {
  id: string;
  period: string;
  partnerCount: number;
  orderCount: number;
  orderBalance: number;
  receivableBalance: number;
  unshippedAmount: number;
};

type BalancePartnerSummaryRow = {
  id: string;
  partner: string;
  orderCount: number;
  orderBalance: number;
  receivableBalance: number;
  unshippedAmount: number;
};

const aggregationModeOptions: { value: AggregationMode; labelJa: string; labelVi: string }[] = [
  { value: "performance", labelJa: "実績", labelVi: "Thực tế" },
  { value: "balance", labelJa: "残高", labelVi: "Số dư" },
];

const performanceTabOptions: { value: PerformanceTab; labelJa: string; labelVi: string }[] = [
  { value: "period", labelJa: "期間別実績", labelVi: "Tổng hợp thực tế theo kỳ" },
  { value: "partner", labelJa: "顧客別実績", labelVi: "Tổng hợp thực tế theo khách hàng" },
  { value: "order", labelJa: "受注明細", labelVi: "Chi tiết đơn hàng" },
  { value: "shipment", labelJa: "出荷明細", labelVi: "Chi tiết xuất hàng" },
  { value: "payment", labelJa: "入金明細", labelVi: "Chi tiết thanh toán" },
];

const groupUnitOptions: { value: GroupUnit; labelJa: string; labelVi: string }[] = [
  { value: "day", labelJa: "日別", labelVi: "Theo ngày" },
  { value: "week", labelJa: "週別", labelVi: "Theo tuần" },
  { value: "month", labelJa: "月別", labelVi: "Theo tháng" },
];

const chartPalette = ["#2563eb", "#0ea5e9", "#14b8a6", "#f97316", "#f59e0b", "#ec4899", "#8b5cf6", "#22c55e"];

const truncateChartLabel = (label: string, maxLength = 12) => {
  const trimmed = label.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(maxLength - 1, 1))}…`;
};

const buildRankingChartData = <T,>(
  rows: T[],
  getLabel: (row: T) => string,
  getValue: (row: T) => number,
  maxItems = 8,
): ChartPoint[] =>
  rows
    .map((row) => ({
      label: truncateChartLabel(getLabel(row) || "-", 14),
      value: getValue(row),
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, maxItems);

const buildPieChartSlices = <T,>(
  rows: T[],
  getLabel: (row: T) => string,
  getValue: (row: T) => number,
  othersLabel: string,
  maxItems = 6,
): ChartSlice[] => {
  const sorted = rows
    .map((row) => ({
      label: getLabel(row) || "-",
      value: getValue(row),
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  if (!sorted.length) {
    return [];
  }

  const topItems = sorted.slice(0, maxItems);
  const remainingTotal = sorted.slice(maxItems).reduce((sum, row) => sum + row.value, 0);
  const slices = topItems.map((row, index) => ({
    label: row.label,
    value: row.value,
    color: chartPalette[index % chartPalette.length],
  }));

  if (remainingTotal > 0) {
    slices.push({
      label: othersLabel,
      value: remainingTotal,
      color: chartPalette[slices.length % chartPalette.length],
    });
  }

  return slices;
};

const toDisplayAmount = (
  amount: number,
  currency: string,
  displayCurrency: CurrencyCode,
  exchangeRates: ExchangeRates,
) => convertFromUsd(convertToUsd(amount, currency, exchangeRates), displayCurrency, exchangeRates);

const getOrderAmount = (items: SalesRow["items"]): number =>
  items.reduce((sum, item) => sum + item.orderQuantity * item.unitPrice, 0);

const getItemShippedQuantityAsOfShipment = (
  shipments: SalesRow["shipments"],
  lineItemId: number,
  currentShipmentId: number,
  currentDeliveryDate: string,
): number =>
  shipments.reduce((sum, shipment) => {
    const dateComparison = shipment.deliveryDate.localeCompare(currentDeliveryDate);
    if (dateComparison > 0 || (dateComparison === 0 && shipment.id > currentShipmentId)) {
      return sum;
    }
    const allocation = shipment.items.find((entry) => entry.lineItemId === lineItemId);
    if (!allocation || allocation.shippedQuantity <= 0) {
      return sum;
    }
    return sum + allocation.shippedQuantity;
  }, 0);

const buildPeriodBuckets = (startDate: string, endDate: string, unit: GroupUnit): PeriodBucket[] => {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  if (!start || !end || start.getTime() > end.getTime()) {
    return [];
  }

  const buckets = new Map<string, PeriodBucket>();
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const current = formatDateInput(cursor);
    const period = getPeriodGroup(current, unit);
    if (period) {
      const existing = buckets.get(period.key);
      if (existing) {
        existing.endDate = current;
      } else {
        buckets.set(period.key, {
          key: period.key,
          label: period.label,
          sortKey: period.sortKey,
          startDate: current,
          endDate: current,
        });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return Array.from(buckets.values()).sort((a, b) => a.sortKey - b.sortKey);
};

export default function SalesAggregationView() {
  const { language } = useLanguage();
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [groupUnit, setGroupUnit] = useState<GroupUnit>("month");
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>("USD");
  const [aggregationMode, setAggregationMode] = useState<AggregationMode>("performance");
  const [performanceTab, setPerformanceTab] = useState<PerformanceTab>("period");

  const tr = (ja: string, vi: string) => (language === "vi" ? vi : ja);
  const currencyLabel = (ja: string, vi: string) => `${tr(ja, vi)} (${displayCurrency})`;
  const currencyPerOrderLabel = (ja: string, vi: string) =>
    `${tr(ja, vi)} (${displayCurrency}/${tr("件", "đơn")})`;
  const otherLabel = tr("その他", "Khác");
  const unassignedLabel = tr("未設定", "Chưa thiết lập");
  const noChartDataMessage = tr("表示できるグラフデータがありません。", "Không có dữ liệu biểu đồ phù hợp.");
  const selectedGroupUnit = groupUnitOptions.find((option) => option.value === groupUnit);
  const groupUnitLabel = tr(selectedGroupUnit?.labelJa ?? "月別", selectedGroupUnit?.labelVi ?? "Theo tháng");

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
          setLoadError(error instanceof Error ? error.message : "Failed to load");
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

  const partnerOptions = useMemo(() => {
    const names = Array.from(
      new Set(
        rows
          .filter((row) => row.documentStatus.orderReceived)
          .map((row) => row.customerName.trim())
          .filter(Boolean),
      ),
    );
    names.sort((a, b) => a.localeCompare(b, "ja"));
    return names;
  }, [rows]);

  const scopedRows = useMemo(
    () =>
      rows.filter((row) => {
        if (!row.documentStatus.orderReceived) {
          return false;
        }
        const partner = row.customerName.trim();
        return selectedPartners.length === 0 || selectedPartners.includes(partner);
      }),
    [rows, selectedPartners],
  );

  const orderActivityRows = useMemo<OrderPerformanceRow[]>(
    () =>
      scopedRows
        .filter((row) => isWithinRange(row.orderDate, startDate, endDate))
        .map((row) => ({
          id: row.salesOrderId,
          salesOrderId: row.salesOrderId,
          orderNo: row.orderNo,
          orderDate: row.orderDate,
          partner: row.customerName.trim(),
          currency: row.currency,
          amount: getOrderAmount(row.items),
        }))
        .sort((a, b) => {
          const dateResult = a.orderDate.localeCompare(b.orderDate);
          if (dateResult !== 0) {
            return dateResult;
          }
          return a.orderNo.localeCompare(b.orderNo, "ja");
        }),
    [endDate, scopedRows, startDate],
  );

  const shipmentRows = useMemo<ShipmentActivityRow[]>(
    () =>
      scopedRows
        .flatMap((row) => {
          const partner = row.customerName.trim();
          return (row.shipments ?? [])
            .map((shipment) => ({
              id: `${row.salesOrderId}-${shipment.id}`,
              salesOrderId: row.salesOrderId,
              date: shipment.deliveryDate,
              partner,
              orderNo: row.orderNo,
              orderDate: row.orderDate,
              amount: getShipmentAmount(shipment, row.items),
              currency: row.currency,
            }))
            .filter((shipment) => shipment.date && shipment.amount > 0);
        })
        .sort((a, b) => {
          const dateResult = a.date.localeCompare(b.date);
          if (dateResult !== 0) {
            return dateResult;
          }
          return a.orderNo.localeCompare(b.orderNo, "ja");
        }),
    [scopedRows],
  );

  const shipmentDetailRows = useMemo<ShipmentDetailRow[]>(() => {
    return scopedRows.flatMap((row) => {
      const partner = row.customerName.trim();
      return (row.shipments ?? []).flatMap((shipment) => {
        const shipmentAmount = getShipmentAmount(shipment, row.items);
        return shipment.items.flatMap((allocation) => {
          if (allocation.shippedQuantity <= 0 || !shipment.deliveryDate) {
            return [];
          }
          const item = row.items.find((entry) => entry.id === allocation.lineItemId);
          if (!item) {
            return [];
          }
          const orderAmount = item.orderQuantity * item.unitPrice;
          const amount = allocation.shippedQuantity * item.unitPrice;
          const shippedQuantityAsOfShipment = getItemShippedQuantityAsOfShipment(
            row.shipments ?? [],
            item.id,
            shipment.id,
            shipment.deliveryDate,
          );
          const remainingQuantity = Math.max(item.orderQuantity - shippedQuantityAsOfShipment, 0);
          const unshippedAmount = remainingQuantity * item.unitPrice;
          const allocatedPaidAmount = shipmentAmount > 0 ? (shipment.paidAmount * amount) / shipmentAmount : 0;
          return [{
            id: `${row.salesOrderId}-${shipment.id}-${allocation.lineItemId}`,
            salesOrderId: row.salesOrderId,
            date: shipment.deliveryDate,
            partner,
            orderNo: row.orderNo,
            orderDate: row.orderDate,
            productCode: item.productCode,
            productName: item.productName,
            orderQuantity: item.orderQuantity,
            shippedQuantity: allocation.shippedQuantity,
            remainingQuantity,
            unitPrice: item.unitPrice,
            orderAmount,
            amount,
            receivableBalance: Math.max(amount - allocatedPaidAmount, 0),
            unshippedAmount,
            currency: row.currency,
          }];
        });
      });
    });
  }, [scopedRows]);

  const paymentRows = useMemo<PaymentDetailRow[]>(() => {
    return scopedRows.flatMap((row) =>
      buildPaidAmountEntries(row.shipments, row.paidAmount, row.paidDate).map((entry, index) => ({
        id: `${row.salesOrderId}-payment-${index + 1}`,
        salesOrderId: row.salesOrderId,
        date: entry.date,
        partner: row.customerName.trim(),
        orderNo: row.orderNo,
        orderDate: row.orderDate,
        amount: entry.amount,
        currency: row.currency,
      })),
    );
  }, [scopedRows]);

  const filteredShipmentRows = useMemo(
    () => shipmentRows.filter((row) => isWithinRange(row.date, startDate, endDate)),
    [endDate, shipmentRows, startDate],
  );
  const filteredShipmentDetailRows = useMemo(
    () => shipmentDetailRows.filter((row) => isWithinRange(row.date, startDate, endDate)),
    [endDate, shipmentDetailRows, startDate],
  );
  const filteredPaymentRows = useMemo(
    () => paymentRows.filter((row) => isWithinRange(row.date, startDate, endDate)),
    [endDate, paymentRows, startDate],
  );

  const balanceOrderRows = useMemo<OrderBalanceRow[]>(() => {
    return scopedRows
      .map((row) => {
        const snapshot = calculateSalesSnapshot(row, endDate);
        const hasBalance = snapshot.orderBalance > 0 || snapshot.receivableBalance > 0 || snapshot.unshippedAmount > 0;
        if (!hasBalance) {
          return null;
        }
        return {
          id: row.salesOrderId,
          salesOrderId: row.salesOrderId,
          orderNo: row.orderNo,
          orderDate: row.orderDate,
          partner: row.customerName.trim(),
          currency: row.currency,
          amount: snapshot.amount,
          shippedAmount: snapshot.shippedAmount,
          paidAmount: snapshot.paidAmount,
          orderBalance: snapshot.orderBalance,
          receivableBalance: snapshot.receivableBalance,
          unshippedAmount: snapshot.unshippedAmount,
        };
      })
      .filter((row): row is OrderBalanceRow => row !== null)
      .sort((a, b) => {
        const dateResult = a.orderDate.localeCompare(b.orderDate);
        if (dateResult !== 0) {
          return dateResult;
        }
        return a.orderNo.localeCompare(b.orderNo, "ja");
      });
  }, [endDate, scopedRows]);

  const displayOrderTotal = useMemo(
    () => convertFromUsd(orderActivityRows.reduce((sum, row) => sum + convertToUsd(row.amount, row.currency, exchangeRates), 0), displayCurrency, exchangeRates),
    [displayCurrency, exchangeRates, orderActivityRows],
  );
  const displayShipmentTotal = useMemo(
    () => convertFromUsd(filteredShipmentRows.reduce((sum, row) => sum + convertToUsd(row.amount, row.currency, exchangeRates), 0), displayCurrency, exchangeRates),
    [displayCurrency, exchangeRates, filteredShipmentRows],
  );
  const displayPaymentTotal = useMemo(
    () => convertFromUsd(filteredPaymentRows.reduce((sum, row) => sum + convertToUsd(row.amount, row.currency, exchangeRates), 0), displayCurrency, exchangeRates),
    [displayCurrency, exchangeRates, filteredPaymentRows],
  );
  const displayOrderBalance = useMemo(
    () => convertFromUsd(balanceOrderRows.reduce((sum, row) => sum + convertToUsd(row.orderBalance, row.currency, exchangeRates), 0), displayCurrency, exchangeRates),
    [balanceOrderRows, displayCurrency, exchangeRates],
  );
  const displayReceivableBalance = useMemo(
    () => convertFromUsd(balanceOrderRows.reduce((sum, row) => sum + convertToUsd(row.receivableBalance, row.currency, exchangeRates), 0), displayCurrency, exchangeRates),
    [balanceOrderRows, displayCurrency, exchangeRates],
  );
  const displayUnshippedAmount = useMemo(
    () => convertFromUsd(balanceOrderRows.reduce((sum, row) => sum + convertToUsd(row.unshippedAmount, row.currency, exchangeRates), 0), displayCurrency, exchangeRates),
    [balanceOrderRows, displayCurrency, exchangeRates],
  );

  const periodBuckets = useMemo(() => buildPeriodBuckets(startDate, endDate, groupUnit), [endDate, groupUnit, startDate]);

  const performancePeriodRows = useMemo<PerformancePeriodSummaryRow[]>(() => {
    return periodBuckets
      .map((bucket) => {
        const bucketOrderRows = orderActivityRows.filter((row) => isWithinRange(row.orderDate, bucket.startDate, bucket.endDate));
        const bucketShipmentRows = filteredShipmentRows.filter((row) => isWithinRange(row.date, bucket.startDate, bucket.endDate));
        const bucketPaymentRows = filteredPaymentRows.filter((row) => isWithinRange(row.date, bucket.startDate, bucket.endDate));
        const activePartners = new Set([
          ...bucketOrderRows.map((row) => row.partner),
          ...bucketShipmentRows.map((row) => row.partner),
          ...bucketPaymentRows.map((row) => row.partner),
        ]);

        return {
          id: bucket.key,
          period: bucket.label,
          partnerCount: activePartners.size,
          orderCount: bucketOrderRows.length,
          orderAmount: convertFromUsd(
            bucketOrderRows.reduce((sum, row) => sum + convertToUsd(row.amount, row.currency, exchangeRates), 0),
            displayCurrency,
            exchangeRates,
          ),
          shipmentCount: bucketShipmentRows.length,
          shipmentAmount: convertFromUsd(
            bucketShipmentRows.reduce((sum, row) => sum + convertToUsd(row.amount, row.currency, exchangeRates), 0),
            displayCurrency,
            exchangeRates,
          ),
          paymentCount: bucketPaymentRows.length,
          paymentAmount: convertFromUsd(
            bucketPaymentRows.reduce((sum, row) => sum + convertToUsd(row.amount, row.currency, exchangeRates), 0),
            displayCurrency,
            exchangeRates,
          ),
        };
      })
      .filter(
        (row) =>
          row.partnerCount > 0 ||
          row.orderCount > 0 ||
          row.orderAmount > 0 ||
          row.shipmentCount > 0 ||
          row.shipmentAmount > 0 ||
          row.paymentCount > 0 ||
          row.paymentAmount > 0,
      );
  }, [displayCurrency, exchangeRates, filteredPaymentRows, filteredShipmentRows, orderActivityRows, periodBuckets]);

  const performancePartnerRows = useMemo<PerformancePartnerSummaryRow[]>(() => {
    const map = new Map<string, PerformancePartnerSummaryRow>();

    const ensureRow = (partner: string): PerformancePartnerSummaryRow => {
      const existing = map.get(partner);
      if (existing) {
        return existing;
      }
      const created: PerformancePartnerSummaryRow = {
        id: partner,
        partner,
        orderCount: 0,
        orderAmount: 0,
        shipmentCount: 0,
        shipmentAmount: 0,
        paymentCount: 0,
        paymentAmount: 0,
      };
      map.set(partner, created);
      return created;
    };

    orderActivityRows.forEach((row) => {
      const target = ensureRow(row.partner);
      target.orderCount += 1;
      target.orderAmount += toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates);
    });
    filteredShipmentRows.forEach((row) => {
      const target = ensureRow(row.partner);
      target.shipmentCount += 1;
      target.shipmentAmount += toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates);
    });
    filteredPaymentRows.forEach((row) => {
      const target = ensureRow(row.partner);
      target.paymentCount += 1;
      target.paymentAmount += toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates);
    });

    return Array.from(map.values())
      .filter(
        (row) =>
          row.orderCount > 0 ||
          row.orderAmount > 0 ||
          row.shipmentCount > 0 ||
          row.shipmentAmount > 0 ||
          row.paymentCount > 0 ||
          row.paymentAmount > 0,
      )
      .sort((a, b) => {
        const shipmentResult = b.shipmentAmount - a.shipmentAmount;
        if (shipmentResult !== 0) {
          return shipmentResult;
        }
        return b.orderAmount - a.orderAmount;
      });
  }, [displayCurrency, exchangeRates, filteredPaymentRows, filteredShipmentRows, orderActivityRows]);

  const periodOrderChartData = useMemo<ChartPoint[]>(
    () => performancePeriodRows.map((row) => ({ label: row.period, value: row.orderAmount })),
    [performancePeriodRows],
  );
  const periodShipmentChartData = useMemo<ChartPoint[]>(
    () => performancePeriodRows.map((row) => ({ label: row.period, value: row.shipmentAmount })),
    [performancePeriodRows],
  );
  const periodPaymentChartData = useMemo<ChartPoint[]>(
    () => performancePeriodRows.map((row) => ({ label: row.period, value: row.paymentAmount })),
    [performancePeriodRows],
  );

  const partnerOrderChartSlices = useMemo<ChartSlice[]>(
    () =>
      buildPieChartSlices(
        performancePartnerRows,
        (row) => row.partner || unassignedLabel,
        (row) => row.orderAmount,
        otherLabel,
      ),
    [otherLabel, performancePartnerRows, unassignedLabel],
  );
  const partnerShipmentChartSlices = useMemo<ChartSlice[]>(
    () =>
      buildPieChartSlices(
        performancePartnerRows,
        (row) => row.partner || unassignedLabel,
        (row) => row.shipmentAmount,
        otherLabel,
      ),
    [otherLabel, performancePartnerRows, unassignedLabel],
  );
  const partnerPaymentChartSlices = useMemo<ChartSlice[]>(
    () =>
      buildPieChartSlices(
        performancePartnerRows,
        (row) => row.partner || unassignedLabel,
        (row) => row.paymentAmount,
        otherLabel,
      ),
    [otherLabel, performancePartnerRows, unassignedLabel],
  );

  const orderTopAmountChartData = useMemo<ChartPoint[]>(
    () =>
      buildRankingChartData(
        orderActivityRows,
        (row) => row.orderNo,
        (row) => toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates),
      ),
    [displayCurrency, exchangeRates, orderActivityRows],
  );
  const orderCountChartData = useMemo<ChartPoint[]>(
    () => performancePeriodRows.map((row) => ({ label: row.period, value: row.orderCount })),
    [performancePeriodRows],
  );

  const shipmentProductChartData = useMemo<ChartPoint[]>(() => {
    const map = new Map<string, number>();
    filteredShipmentDetailRows.forEach((row) => {
      const label = row.productCode.trim() || row.productName.trim() || unassignedLabel;
      const current = map.get(label) ?? 0;
      map.set(label, current + toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates));
    });
    return buildRankingChartData(
      Array.from(map.entries()).map(([label, value]) => ({ label, value })),
      (row) => row.label,
      (row) => row.value,
    );
  }, [displayCurrency, exchangeRates, filteredShipmentDetailRows, unassignedLabel]);

  const paymentOrderChartData = useMemo<ChartPoint[]>(() => {
    const map = new Map<string, number>();
    filteredPaymentRows.forEach((row) => {
      const label = row.orderNo.trim() || unassignedLabel;
      const current = map.get(label) ?? 0;
      map.set(label, current + toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates));
    });
    return buildRankingChartData(
      Array.from(map.entries()).map(([label, value]) => ({ label, value })),
      (row) => row.label,
      (row) => row.value,
    );
  }, [displayCurrency, exchangeRates, filteredPaymentRows, unassignedLabel]);

  const balancePeriodRows = useMemo<BalancePeriodSummaryRow[]>(() => {
    return periodBuckets
      .map((bucket) => {
        const activeSnapshots = scopedRows
          .map((row) => ({
            partner: row.customerName.trim(),
            currency: row.currency,
            snapshot: calculateSalesSnapshot(row, bucket.endDate),
          }))
          .filter(
            (row) =>
              row.snapshot.orderBalance > 0 ||
              row.snapshot.receivableBalance > 0 ||
              row.snapshot.unshippedAmount > 0,
          );

        return {
          id: bucket.key,
          period: bucket.label,
          partnerCount: new Set(activeSnapshots.map((row) => row.partner)).size,
          orderCount: activeSnapshots.length,
          orderBalance: convertFromUsd(
            activeSnapshots.reduce((sum, row) => sum + convertToUsd(row.snapshot.orderBalance, row.currency, exchangeRates), 0),
            displayCurrency,
            exchangeRates,
          ),
          receivableBalance: convertFromUsd(
            activeSnapshots.reduce((sum, row) => sum + convertToUsd(row.snapshot.receivableBalance, row.currency, exchangeRates), 0),
            displayCurrency,
            exchangeRates,
          ),
          unshippedAmount: convertFromUsd(
            activeSnapshots.reduce((sum, row) => sum + convertToUsd(row.snapshot.unshippedAmount, row.currency, exchangeRates), 0),
            displayCurrency,
            exchangeRates,
          ),
        };
      })
      .filter(
        (row) =>
          row.partnerCount > 0 ||
          row.orderCount > 0 ||
          row.orderBalance > 0 ||
          row.receivableBalance > 0 ||
          row.unshippedAmount > 0,
      );
  }, [displayCurrency, exchangeRates, periodBuckets, scopedRows]);

  const balancePartnerRows = useMemo<BalancePartnerSummaryRow[]>(() => {
    const map = new Map<string, BalancePartnerSummaryRow>();

    scopedRows.forEach((row) => {
      const snapshot = calculateSalesSnapshot(row, endDate);
      const hasBalance = snapshot.orderBalance > 0 || snapshot.receivableBalance > 0 || snapshot.unshippedAmount > 0;
      if (!hasBalance) {
        return;
      }

      const partner = row.customerName.trim() || "未設定";
      const existing = map.get(partner) ?? {
        id: partner,
        partner,
        orderCount: 0,
        orderBalance: 0,
        receivableBalance: 0,
        unshippedAmount: 0,
      };

      existing.orderCount += 1;
      existing.orderBalance += toDisplayAmount(snapshot.orderBalance, row.currency, displayCurrency, exchangeRates);
      existing.receivableBalance += toDisplayAmount(snapshot.receivableBalance, row.currency, displayCurrency, exchangeRates);
      existing.unshippedAmount += toDisplayAmount(snapshot.unshippedAmount, row.currency, displayCurrency, exchangeRates);
      map.set(partner, existing);
    });

    return Array.from(map.values())
      .filter(
        (row) =>
          row.orderCount > 0 ||
          row.orderBalance > 0 ||
          row.receivableBalance > 0 ||
          row.unshippedAmount > 0,
      )
      .sort((a, b) => b.orderBalance - a.orderBalance);
  }, [displayCurrency, endDate, exchangeRates, scopedRows]);

  const handleReset = () => {
    const range = getCurrentMonthRange();
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setSelectedPartners([]);
    setGroupUnit("month");
    setDisplayCurrency("USD");
    setAggregationMode("performance");
    setPerformanceTab("period");
  };

  if (loading) {
    return <div className="text-sm text-gray-500">{tr("読み込み中...", "Đang tải...")}</div>;
  }

  if (loadError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {tr("受注データの読み込みに失敗しました。", "Không thể tải dữ liệu quản lý đơn bán.")}
        {loadError ? ` ${loadError}` : ""}
      </div>
    );
  }

  const performancePeriodColumns: TableColumn<PerformancePeriodSummaryRow>[] = [
    { key: "period", header: tr("期間", "Khoảng thời gian"), render: (row) => <span className="text-sm">{row.period}</span> },
    { key: "partnerCount", header: tr("顧客数", "Số khách hàng"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.partnerCount)}</span> },
    { key: "orderCount", header: tr("受注件数", "Số đơn hàng"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.orderCount)}</span> },
    { key: "orderAmount", header: currencyLabel("受注金額", "Giá trị đơn hàng"), align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, row.orderAmount)}</span> },
    { key: "shipmentCount", header: tr("出荷件数", "Số đợt xuất hàng"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.shipmentCount)}</span> },
    { key: "shipmentAmount", header: currencyLabel("出荷金額", "Giá trị xuất hàng"), align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, row.shipmentAmount)}</span> },
    { key: "paymentCount", header: tr("入金件数", "Số lần thanh toán"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.paymentCount)}</span> },
    { key: "paymentAmount", header: currencyLabel("入金金額", "Giá trị thanh toán"), align: "right", render: (row) => <span className="text-sm font-semibold text-emerald-700">{formatCurrencyValue(displayCurrency, row.paymentAmount)}</span> },
  ];

  const performancePartnerColumns: TableColumn<PerformancePartnerSummaryRow>[] = [
    { key: "partner", header: tr("顧客", "Khách hàng"), render: (row) => <span className="text-sm font-semibold">{row.partner}</span> },
    { key: "orderCount", header: tr("受注件数", "Số đơn hàng"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.orderCount)}</span> },
    { key: "orderAmount", header: currencyLabel("受注金額", "Giá trị đơn hàng"), align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, row.orderAmount)}</span> },
    { key: "shipmentCount", header: tr("出荷件数", "Số đợt xuất hàng"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.shipmentCount)}</span> },
    { key: "shipmentAmount", header: currencyLabel("出荷金額", "Giá trị xuất hàng"), align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, row.shipmentAmount)}</span> },
    { key: "paymentCount", header: tr("入金件数", "Số lần thanh toán"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.paymentCount)}</span> },
    { key: "paymentAmount", header: currencyLabel("入金金額", "Giá trị thanh toán"), align: "right", render: (row) => <span className="text-sm font-semibold text-emerald-700">{formatCurrencyValue(displayCurrency, row.paymentAmount)}</span> },
  ];

  const orderActivityColumns: TableColumn<OrderPerformanceRow>[] = [
    { key: "orderDate", header: tr("受注日", "Ngày đặt hàng"), render: (row) => <span className="text-sm">{row.orderDate}</span> },
    { key: "orderNo", header: "PO NO.", render: (row) => <span className="text-sm font-semibold text-blue-600">{row.orderNo}</span> },
    { key: "partner", header: tr("顧客", "Khách hàng"), render: (row) => <span className="text-sm font-semibold">{row.partner}</span> },
    { key: "amount", header: currencyLabel("受注金額", "Giá trị đơn hàng"), align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates))}</span> },
  ];

  const balancePeriodColumns: TableColumn<BalancePeriodSummaryRow>[] = [
    { key: "period", header: tr("期間", "Khoảng thời gian"), render: (row) => <span className="text-sm">{row.period}</span> },
    { key: "partnerCount", header: tr("顧客数", "Số khách hàng"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.partnerCount)}</span> },
    { key: "orderCount", header: tr("残案件数", "Số đơn còn dư"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.orderCount)}</span> },
    { key: "orderBalance", header: currencyLabel("受注残高", "Số dư đơn hàng"), align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, row.orderBalance)}</span> },
    { key: "receivableBalance", header: currencyLabel("売掛残高", "Công nợ phải thu"), align: "right", render: (row) => <span className="text-sm font-semibold text-amber-700">{formatCurrencyValue(displayCurrency, row.receivableBalance)}</span> },
    { key: "unshippedAmount", header: currencyLabel("未出荷残高", "Số dư chưa xuất"), align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, row.unshippedAmount)}</span> },
  ];

  const balancePartnerColumns: TableColumn<BalancePartnerSummaryRow>[] = [
    { key: "partner", header: tr("顧客", "Khách hàng"), render: (row) => <span className="text-sm font-semibold">{row.partner}</span> },
    { key: "orderCount", header: tr("残案件数", "Số đơn còn dư"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.orderCount)}</span> },
    { key: "orderBalance", header: currencyLabel("受注残高", "Số dư đơn hàng"), align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, row.orderBalance)}</span> },
    { key: "receivableBalance", header: currencyLabel("売掛残高", "Công nợ phải thu"), align: "right", render: (row) => <span className="text-sm font-semibold text-amber-700">{formatCurrencyValue(displayCurrency, row.receivableBalance)}</span> },
    { key: "unshippedAmount", header: currencyLabel("未出荷残高", "Số dư chưa xuất"), align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, row.unshippedAmount)}</span> },
  ];

  const orderColumns: TableColumn<OrderBalanceRow>[] = [
    { key: "orderDate", header: tr("受注日", "Ngày đặt hàng"), render: (row) => <span className="text-sm">{row.orderDate}</span> },
    { key: "orderNo", header: "PO NO.", render: (row) => <span className="text-sm font-semibold text-blue-600">{row.orderNo}</span> },
    { key: "partner", header: tr("顧客", "Khách hàng"), render: (row) => <span className="text-sm font-semibold">{row.partner}</span> },
    { key: "amount", header: currencyLabel("受注金額", "Giá trị đơn hàng"), align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates))}</span> },
    { key: "shippedAmount", header: currencyLabel("出荷済金額", "Giá trị đã xuất"), align: "right", render: (row) => <span className="text-sm">{formatCurrencyValue(displayCurrency, toDisplayAmount(row.shippedAmount, row.currency, displayCurrency, exchangeRates))}</span> },
    { key: "paidAmount", header: currencyLabel("入金累計", "Tổng tiền đã thanh toán"), align: "right", render: (row) => <span className="text-sm">{formatCurrencyValue(displayCurrency, toDisplayAmount(row.paidAmount, row.currency, displayCurrency, exchangeRates))}</span> },
    { key: "orderBalance", header: currencyLabel("受注残高", "Số dư đơn hàng"), align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, toDisplayAmount(row.orderBalance, row.currency, displayCurrency, exchangeRates))}</span> },
    { key: "receivableBalance", header: currencyLabel("売掛残高", "Công nợ phải thu"), align: "right", render: (row) => <span className="text-sm font-semibold text-amber-700">{formatCurrencyValue(displayCurrency, toDisplayAmount(row.receivableBalance, row.currency, displayCurrency, exchangeRates))}</span> },
    { key: "unshippedAmount", header: currencyLabel("未出荷残高", "Số dư chưa xuất"), align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, toDisplayAmount(row.unshippedAmount, row.currency, displayCurrency, exchangeRates))}</span> },
  ];

  const shipmentColumns: TableColumn<ShipmentDetailRow>[] = [
    { key: "date", header: tr("出荷日", "Ngày xuất hàng"), render: (row) => <span className="text-sm">{row.date}</span> },
    { key: "orderNo", header: "PO NO.", render: (row) => <span className="text-sm font-semibold text-blue-600">{row.orderNo}</span> },
    { key: "orderDate", header: tr("受注日", "Ngày đặt hàng"), render: (row) => <span className="text-sm">{row.orderDate}</span> },
    { key: "partner", header: tr("顧客", "Khách hàng"), render: (row) => <span className="text-sm font-semibold">{row.partner}</span> },
    { key: "product", header: tr("品目/品番", "Sản phẩm / Mã hàng"), render: (row) => <div className="flex flex-col text-sm"><span className="font-semibold">{row.productCode}</span><span className="text-gray-600">{row.productName}</span></div> },
    { key: "orderQuantity", header: tr("注数", "Số lượng đặt"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.orderQuantity)}</span> },
    { key: "shippedQuantity", header: tr("出荷数", "Số lượng xuất"), align: "right", render: (row) => <span className="text-sm font-semibold">{formatNumberValue(row.shippedQuantity)}</span> },
    { key: "remainingQuantity", header: tr("出荷残数", "Số lượng chưa xuất"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.remainingQuantity)}</span> },
    { key: "unitPrice", header: currencyLabel("単価", "Đơn giá"), align: "right", render: (row) => <span className="text-sm">{formatCurrencyValue(displayCurrency, toDisplayAmount(row.unitPrice, row.currency, displayCurrency, exchangeRates))}</span> },
    { key: "orderAmount", header: currencyLabel("品目受注金額", "Giá trị đặt của mặt hàng"), align: "right", render: (row) => <span className="text-sm">{formatCurrencyValue(displayCurrency, toDisplayAmount(row.orderAmount, row.currency, displayCurrency, exchangeRates))}</span> },
    { key: "amount", header: currencyLabel("売上金額", "Giá trị bán hàng"), align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates))}</span> },
    { key: "receivableBalance", header: currencyLabel("売掛残高", "Công nợ phải thu"), align: "right", render: (row) => <span className="text-sm font-semibold text-amber-700">{formatCurrencyValue(displayCurrency, toDisplayAmount(row.receivableBalance, row.currency, displayCurrency, exchangeRates))}</span> },
    { key: "unshippedAmount", header: currencyLabel("品目未出荷残高", "Số dư chưa xuất của mặt hàng"), align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, toDisplayAmount(row.unshippedAmount, row.currency, displayCurrency, exchangeRates))}</span> },
  ];

  const paymentColumns: TableColumn<PaymentDetailRow>[] = [
    { key: "date", header: tr("入金日", "Ngày thanh toán"), render: (row) => <span className="text-sm">{row.date}</span> },
    { key: "orderNo", header: "PO NO.", render: (row) => <span className="text-sm font-semibold text-blue-600">{row.orderNo}</span> },
    { key: "orderDate", header: tr("受注日", "Ngày đặt hàng"), render: (row) => <span className="text-sm">{row.orderDate}</span> },
    { key: "partner", header: tr("顧客", "Khách hàng"), render: (row) => <span className="text-sm font-semibold">{row.partner}</span> },
    { key: "amount", header: currencyLabel("入金金額", "Giá trị thanh toán"), align: "right", render: (row) => <span className="text-sm font-semibold text-emerald-700">{formatCurrencyValue(displayCurrency, toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates))}</span> },
  ];

  const performanceSummaryCards = [
    { label: currencyLabel("受注金額", "Giá trị đơn hàng"), value: formatCurrencyValue(displayCurrency, displayOrderTotal), valueClassName: "text-gray-900" },
    { label: currencyLabel("出荷金額", "Giá trị xuất hàng"), value: formatCurrencyValue(displayCurrency, displayShipmentTotal), valueClassName: "text-gray-900" },
    { label: currencyLabel("入金金額", "Giá trị thanh toán"), value: formatCurrencyValue(displayCurrency, displayPaymentTotal), valueClassName: "text-emerald-700" },
    { label: tr("受注件数", "Số đơn hàng"), value: formatNumberValue(orderActivityRows.length), valueClassName: "text-gray-900" },
    { label: tr("出荷件数", "Số đợt xuất hàng"), value: formatNumberValue(filteredShipmentRows.length), valueClassName: "text-gray-900" },
    { label: tr("入金件数", "Số lần thanh toán"), value: formatNumberValue(filteredPaymentRows.length), valueClassName: "text-gray-900" },
  ];

  const balanceSummaryCards = [
    { label: currencyLabel("受注残高", "Số dư đơn hàng"), value: formatCurrencyValue(displayCurrency, displayOrderBalance), valueClassName: "text-gray-900" },
    { label: currencyLabel("売掛残高", "Công nợ phải thu"), value: formatCurrencyValue(displayCurrency, displayReceivableBalance), valueClassName: "text-amber-700" },
    { label: currencyLabel("未出荷残高", "Số dư chưa xuất"), value: formatCurrencyValue(displayCurrency, displayUnshippedAmount), valueClassName: "text-gray-900" },
    { label: tr("残案件数", "Số đơn còn dư"), value: formatNumberValue(balanceOrderRows.length), valueClassName: "text-gray-900" },
    { label: tr("顧客数", "Số khách hàng"), value: formatNumberValue(balancePartnerRows.length), valueClassName: "text-gray-900" },
    { label: currencyPerOrderLabel("平均受注残高", "Số dư đơn hàng bình quân"), value: formatCurrencyValue(displayCurrency, balanceOrderRows.length > 0 ? displayOrderBalance / balanceOrderRows.length : 0), valueClassName: "text-gray-900" },
  ];

  const isBalanceMode = aggregationMode === "balance";
  const periodLabel = isBalanceMode ? tr("残高基準期間", "Kỳ số dư") : tr("期間", "Khoảng thời gian");
  const startDateLabel = isBalanceMode ? tr("推移開始日", "Từ ngày") : tr("開始日", "Từ ngày");
  const endDateLabel = isBalanceMode ? tr("残高基準日", "Ngày chốt số dư") : tr("終了日", "Đến ngày");
  const modeDescription = isBalanceMode
    ? tr("残高モードでは終了日を基準に残高を表示します。", "Chế độ số dư hiển thị số dư tại ngày kết thúc đã chọn.")
    : tr("実績モードでは期間内に発生した受注・出荷・入金を表示します。", "Chế độ thực tế hiển thị đơn hàng, xuất hàng và thanh toán phát sinh trong khoảng thời gian đã chọn.");

  const notes = [
    tr("集計対象: 確定のみ（受注書受領）", "Phạm vi tổng hợp: chỉ dữ liệu đã xác nhận (đã nhận đơn đặt hàng)"),
    ...(aggregationMode === "performance"
      ? [
          tr("実績基準: 期間内に発生した受注 / 出荷 / 入金", "Cơ sở thực tế: đơn hàng / xuất hàng / thanh toán phát sinh trong kỳ"),
          tr("受注基準: 受注日", "Cơ sở đơn hàng: ngày đặt hàng"),
          tr("出荷基準: 出荷日", "Cơ sở xuất hàng: ngày xuất hàng"),
          tr("入金基準: 入金日", "Cơ sở thanh toán: ngày thanh toán"),
        ]
      : [tr("残高基準: 集計終了日時点", "Cơ sở số dư: tại ngày kết thúc tổng hợp")]),
    `1 USD = ${formatNumberValue(exchangeRates.jpyPerUsd)} JPY / ${formatNumberValue(exchangeRates.vndPerUsd)} VND`,
  ];

  const summaryCards = aggregationMode === "performance" ? performanceSummaryCards : balanceSummaryCards;
  const hasData =
    aggregationMode === "performance"
      ? performancePeriodRows.length > 0 ||
        performancePartnerRows.length > 0 ||
        orderActivityRows.length > 0 ||
        filteredShipmentDetailRows.length > 0 ||
        filteredPaymentRows.length > 0
      : balancePeriodRows.length > 0 || balancePartnerRows.length > 0 || balanceOrderRows.length > 0;

  const performanceTabContent = (() => {
    switch (performanceTab) {
      case "period":
        return {
          title: tr("期間別実績", "Tổng hợp thực tế theo kỳ"),
          rows: performancePeriodRows.length,
          content: (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {renderChartCard(
                  tr("受注金額推移", "Xu hướng giá trị đơn hàng"),
                  `${groupUnitLabel} / ${displayCurrency}`,
                  <div className="h-56">
                    <BarLineChart
                      data={periodOrderChartData}
                      height={220}
                      barColor="#bfdbfe"
                      lineColor="#2563eb"
                      unitLabel={displayCurrency}
                    />
                  </div>,
                  undefined,
                  tr("受注", "Đơn hàng"),
                )}
                {renderChartCard(
                  tr("出荷金額推移", "Xu hướng giá trị xuất hàng"),
                  `${groupUnitLabel} / ${displayCurrency}`,
                  <div className="h-56">
                    <BarLineChart
                      data={periodShipmentChartData}
                      height={220}
                      barColor="#fdba74"
                      lineColor="#ea580c"
                      unitLabel={displayCurrency}
                    />
                  </div>,
                  undefined,
                  tr("出荷", "Xuất hàng"),
                )}
                {renderChartCard(
                  tr("入金金額推移", "Xu hướng giá trị thanh toán"),
                  `${groupUnitLabel} / ${displayCurrency}`,
                  <div className="h-56">
                    <BarLineChart
                      data={periodPaymentChartData}
                      height={220}
                      barColor="#86efac"
                      lineColor="#16a34a"
                      unitLabel={displayCurrency}
                    />
                  </div>,
                  undefined,
                  tr("入金", "Thanh toán"),
                )}
              </div>
              <DataTable columns={performancePeriodColumns} rows={performancePeriodRows} getRowId={(row) => row.id} enableHorizontalScroll />
            </div>
          ),
        };
      case "partner":
        return {
          title: tr("顧客別実績", "Tổng hợp thực tế theo khách hàng"),
          rows: performancePartnerRows.length,
          content: (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {renderChartCard(
                  tr("受注金額構成", "Cơ cấu giá trị đơn hàng"),
                  tr("選択期間内の顧客別受注金額", "Giá trị đơn hàng theo khách hàng trong kỳ đã chọn"),
                  renderPieChartBody(partnerOrderChartSlices),
                  partnerOrderChartSlices.length ? renderPieLegend(partnerOrderChartSlices) : undefined,
                  displayCurrency,
                )}
                {renderChartCard(
                  tr("出荷金額構成", "Cơ cấu giá trị xuất hàng"),
                  tr("選択期間内の顧客別出荷金額", "Giá trị xuất hàng theo khách hàng trong kỳ đã chọn"),
                  renderPieChartBody(partnerShipmentChartSlices),
                  partnerShipmentChartSlices.length ? renderPieLegend(partnerShipmentChartSlices) : undefined,
                  displayCurrency,
                )}
                {renderChartCard(
                  tr("入金金額構成", "Cơ cấu giá trị thanh toán"),
                  tr("選択期間内の顧客別入金金額", "Giá trị thanh toán theo khách hàng trong kỳ đã chọn"),
                  renderPieChartBody(partnerPaymentChartSlices),
                  partnerPaymentChartSlices.length ? renderPieLegend(partnerPaymentChartSlices) : undefined,
                  displayCurrency,
                )}
              </div>
              <DataTable columns={performancePartnerColumns} rows={performancePartnerRows} getRowId={(row) => row.id} enableHorizontalScroll />
            </div>
          ),
        };
      case "order":
        return {
          title: tr("受注明細", "Chi tiết đơn hàng"),
          rows: orderActivityRows.length,
          content: (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {renderChartCard(
                  tr("受注金額上位", "Đơn hàng giá trị cao"),
                  tr("選択期間内の受注金額上位", "Các đơn hàng có giá trị cao trong kỳ đã chọn"),
                  <div className="h-56">
                    <BarLineChart
                      data={orderTopAmountChartData}
                      height={220}
                      barColor="#bfdbfe"
                      lineColor="#2563eb"
                      unitLabel={displayCurrency}
                    />
                  </div>,
                  undefined,
                  tr("上位8件", "Top 8"),
                )}
                {renderChartCard(
                  tr("受注件数推移", "Xu hướng số đơn hàng"),
                  `${groupUnitLabel} / ${tr("件", "đơn")}`,
                  <div className="h-56">
                    <BarLineChart
                      data={orderCountChartData}
                      height={220}
                      barColor="#cbd5e1"
                      lineColor="#475569"
                      unitLabel={tr("件", "đơn")}
                    />
                  </div>,
                  undefined,
                  groupUnitLabel,
                )}
                {renderChartCard(
                  tr("顧客別受注構成", "Cơ cấu đơn hàng theo khách hàng"),
                  tr("受注金額ベースの顧客構成", "Cơ cấu khách hàng theo giá trị đơn hàng"),
                  renderPieChartBody(partnerOrderChartSlices),
                  partnerOrderChartSlices.length ? renderPieLegend(partnerOrderChartSlices) : undefined,
                  displayCurrency,
                )}
              </div>
              <DataTable columns={orderActivityColumns} rows={orderActivityRows} getRowId={(row) => row.id} enableHorizontalScroll />
            </div>
          ),
        };
      case "shipment":
        return {
          title: tr("出荷明細", "Chi tiết xuất hàng"),
          rows: filteredShipmentDetailRows.length,
          content: (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {renderChartCard(
                  tr("出荷金額推移", "Xu hướng giá trị xuất hàng"),
                  `${groupUnitLabel} / ${displayCurrency}`,
                  <div className="h-56">
                    <BarLineChart
                      data={periodShipmentChartData}
                      height={220}
                      barColor="#fdba74"
                      lineColor="#ea580c"
                      unitLabel={displayCurrency}
                    />
                  </div>,
                  undefined,
                  groupUnitLabel,
                )}
                {renderChartCard(
                  tr("顧客別出荷構成", "Cơ cấu xuất hàng theo khách hàng"),
                  tr("出荷金額ベースの顧客構成", "Cơ cấu khách hàng theo giá trị xuất hàng"),
                  renderPieChartBody(partnerShipmentChartSlices),
                  partnerShipmentChartSlices.length ? renderPieLegend(partnerShipmentChartSlices) : undefined,
                  displayCurrency,
                )}
                {renderChartCard(
                  tr("品目別出荷金額上位", "Mặt hàng xuất giá trị cao"),
                  tr("選択期間内の出荷金額上位品目", "Các mặt hàng có giá trị xuất cao trong kỳ đã chọn"),
                  <div className="h-56">
                    <BarLineChart
                      data={shipmentProductChartData}
                      height={220}
                      barColor="#fed7aa"
                      lineColor="#f97316"
                      unitLabel={displayCurrency}
                    />
                  </div>,
                  undefined,
                  tr("上位8品目", "Top 8"),
                )}
              </div>
              <DataTable columns={shipmentColumns} rows={filteredShipmentDetailRows} getRowId={(row) => row.id} enableHorizontalScroll />
            </div>
          ),
        };
      case "payment":
        return {
          title: tr("入金明細", "Chi tiết thanh toán"),
          rows: filteredPaymentRows.length,
          content: (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {renderChartCard(
                  tr("入金金額推移", "Xu hướng giá trị thanh toán"),
                  `${groupUnitLabel} / ${displayCurrency}`,
                  <div className="h-56">
                    <BarLineChart
                      data={periodPaymentChartData}
                      height={220}
                      barColor="#86efac"
                      lineColor="#16a34a"
                      unitLabel={displayCurrency}
                    />
                  </div>,
                  undefined,
                  groupUnitLabel,
                )}
                {renderChartCard(
                  tr("顧客別入金構成", "Cơ cấu thanh toán theo khách hàng"),
                  tr("入金金額ベースの顧客構成", "Cơ cấu khách hàng theo giá trị thanh toán"),
                  renderPieChartBody(partnerPaymentChartSlices),
                  partnerPaymentChartSlices.length ? renderPieLegend(partnerPaymentChartSlices) : undefined,
                  displayCurrency,
                )}
                {renderChartCard(
                  tr("PO別入金金額上位", "PO có giá trị thanh toán cao"),
                  tr("選択期間内の入金金額上位PO", "Các PO có giá trị thanh toán cao trong kỳ đã chọn"),
                  <div className="h-56">
                    <BarLineChart
                      data={paymentOrderChartData}
                      height={220}
                      barColor="#bbf7d0"
                      lineColor="#16a34a"
                      unitLabel={displayCurrency}
                    />
                  </div>,
                  undefined,
                  tr("上位8件", "Top 8"),
                )}
              </div>
              <DataTable columns={paymentColumns} rows={filteredPaymentRows} getRowId={(row) => row.id} enableHorizontalScroll />
            </div>
          ),
        };
    }
  })();

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (endDate && value && value > endDate) {
      setEndDate(value);
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (startDate && value && value < startDate) {
      setStartDate(value);
    }
  };

  function renderPieLegend(slices: ChartSlice[]) {
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);
    return (
      <div className="flex flex-col gap-2">
        {slices.map((slice) => {
          const percent = total > 0 ? (slice.value / total) * 100 : 0;
          return (
            <div key={slice.label} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                <span className="truncate text-gray-700">{slice.label}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-gray-500">
                <span>{percent.toFixed(1)}%</span>
                <span className="font-medium text-gray-700">
                  {formatCurrencyValue(displayCurrency, slice.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderPieChartBody(slices: ChartSlice[]) {
    return slices.length ? (
      <div className="flex justify-center">
        <PieChart data={slices} size={176} strokeWidth={1} />
      </div>
    ) : (
      <div className="flex h-44 items-center justify-center text-sm text-gray-400">{noChartDataMessage}</div>
    );
  }

  function renderChartCard(
    title: string,
    description: string,
    chart: ReactNode,
    legend?: ReactNode,
    badge?: string,
  ) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-gray-700">{title}</div>
            <div className="text-xs text-gray-500">{description}</div>
          </div>
          {badge ? (
            <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-500">{badge}</span>
          ) : null}
        </div>
        <div className="mt-4">{chart}</div>
        {legend ? <div className="mt-4 border-t border-gray-100 pt-4">{legend}</div> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Paper elevation={0} className="rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">{periodLabel}</span>
              <div className="flex items-end gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-gray-400">{startDateLabel}</span>
                  <TextField
                    size="small"
                    type="date"
                    value={startDate}
                    onChange={(event) => handleStartDateChange(event.target.value)}
                    inputProps={{ max: endDate || undefined }}
                  />
                </div>
                <span className="text-gray-400">〜</span>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-gray-400">{endDateLabel}</span>
                  <TextField
                    size="small"
                    type="date"
                    value={endDate}
                    onChange={(event) => handleEndDateChange(event.target.value)}
                    inputProps={{ min: startDate || undefined }}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">{tr("顧客", "Khách hàng")}</span>
              <Select size="small" multiple displayEmpty value={selectedPartners} onChange={(event) => setSelectedPartners(event.target.value as string[])} sx={{ minWidth: { xs: 200, sm: 260 } }} renderValue={(selected) => selected.length ? selected.join(", ") : <span className="text-gray-400">{tr("すべて", "Tất cả")}</span>}>
                {partnerOptions.map((option) => <MenuItem key={option} value={option}><Checkbox checked={selectedPartners.includes(option)} /><ListItemText primary={option} /></MenuItem>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">{tr("集計単位", "Đơn vị tổng hợp")}</span>
              <Select size="small" value={groupUnit} onChange={(event) => setGroupUnit(event.target.value as GroupUnit)} sx={{ minWidth: 140 }}>
                {groupUnitOptions.map((option) => <MenuItem key={option.value} value={option.value}>{tr(option.labelJa, option.labelVi)}</MenuItem>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">{tr("表示通貨", "Tiền tệ hiển thị")}</span>
              <Select size="small" value={displayCurrency} onChange={(event) => setDisplayCurrency(event.target.value as CurrencyCode)} sx={{ minWidth: 120 }}>
                {CURRENCY_OPTION_ITEMS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">{tr("集計モード", "Chế độ tổng hợp")}</span>
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                {aggregationModeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAggregationMode(option.value)}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                      aggregationMode === option.value
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tr(option.labelJa, option.labelVi)}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="outlined" size="small" onClick={handleReset} className="h-10">{tr("リセット", "Đặt lại")}</Button>
          </div>
          <div className={`rounded-lg border px-3 py-2 text-sm ${isBalanceMode ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}>
            {modeDescription}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {notes.map((note) => <span key={note} className="rounded-full bg-gray-100 px-2 py-1">{note}</span>)}
          </div>
        </div>
      </Paper>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((item) => <div key={item.label} className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm"><div className="text-sm font-semibold text-gray-500">{item.label}</div><div className={`text-2xl font-bold ${item.valueClassName}`}>{item.value}</div></div>)}
      </div>

      {hasData ? (
        aggregationMode === "performance" ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="inline-flex w-fit flex-wrap rounded-lg border border-gray-200 bg-gray-50 p-1">
                {performanceTabOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPerformanceTab(option.value)}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                      performanceTab === option.value
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tr(option.labelJa, option.labelVi)}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <div className="text-sm font-semibold text-gray-700">{performanceTabContent.title}</div>
                {performanceTabContent.rows > 0 ? (
                  performanceTabContent.content
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
                    {tr("条件に一致するデータがありません。", "Không có dữ liệu phù hợp với điều kiện đã chọn.")}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3"><div className="text-sm font-semibold text-gray-700">{tr("期間別残高推移", "Biến động số dư theo kỳ")}</div><div className="text-xs text-gray-500">{tr("選択した期間の各期間末時点における受注残高 / 売掛残高 / 未出荷残高を表示します。", "Hiển thị số dư đơn hàng / công nợ phải thu / số dư chưa xuất tại thời điểm cuối mỗi kỳ trong khoảng thời gian đã chọn.")}</div><DataTable columns={balancePeriodColumns} rows={balancePeriodRows} getRowId={(row) => row.id} enableHorizontalScroll /></div>
            <div className="flex flex-col gap-3"><div className="text-sm font-semibold text-gray-700">{tr("顧客別残高", "Số dư theo khách hàng")}</div><div className="text-xs text-gray-500">{tr("集計終了日時点で残っている案件のみを集計", "Chỉ tổng hợp các đơn còn số dư tại ngày kết thúc tổng hợp.")}</div><DataTable columns={balancePartnerColumns} rows={balancePartnerRows} getRowId={(row) => row.id} enableHorizontalScroll /></div>
            <div className="flex flex-col gap-3"><div className="text-sm font-semibold text-gray-700">{tr("受注残高サマリー", "Tổng hợp số dư đơn hàng")}</div><div className="text-xs text-gray-500">{tr("集計終了日時点の受注残高 / 売掛残高 / 未出荷残高", "Hiển thị số dư đơn hàng / công nợ phải thu / số dư chưa xuất tại ngày kết thúc tổng hợp.")}</div><DataTable columns={orderColumns} rows={balanceOrderRows} getRowId={(row) => row.id} enableHorizontalScroll /></div>
          </div>
        )
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">{tr("条件に一致するデータがありません。", "Không có dữ liệu phù hợp với điều kiện đã chọn.")}</div>
      )}
    </div>
  );
}
