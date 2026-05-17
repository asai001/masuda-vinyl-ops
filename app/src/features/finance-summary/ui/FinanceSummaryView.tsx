"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, Checkbox, ListItemText, MenuItem, Paper, Select, TextField } from "@mui/material";
import DataTable, { type TableColumn } from "@/components/DataTable";
import BarLineChart from "@/components/charts/BarLineChart";
import PieChart from "@/components/charts/PieChart";
import { CURRENCY_OPTION_ITEMS, type CurrencyCode } from "@/constants/currency";
import {
  DEFAULT_EXCHANGE_RATES,
  convertFromUsd,
  convertToUsd,
  formatCurrencyValue,
  formatNumberValue,
  getCurrentMonthRange,
  getPeriodGroup,
  isWithinRange,
  normalizeDateInputValue,
  normalizeExchangeRates,
  parseDateInput,
  type GroupUnit,
} from "@/features/aggregation/aggregationUtils";
import { fetchPurchaseOrderRows } from "@/features/order-management/api/client";
import type { OrderRow } from "@/features/order-management/types";
import { fetchPaymentManagementRows } from "@/features/payment-management/api/client";
import type { PaymentManagementRow } from "@/features/payment-management/types";
import { fetchSalesOrderRows } from "@/features/sales-management/api/client";
import { buildPaidAmountEntries, getShipmentAmount } from "@/features/sales-management/salesManagementUtils";
import type { SalesRow } from "@/features/sales-management/types";
import { fetchExchangeRates } from "@/features/settings/api/client";
import type { ExchangeRates } from "@/features/settings/types";
import { useLanguage } from "@/lib/i18n/language";

type FinanceTab = "period" | "customer" | "category" | "revenue" | "expense";
type PeriodChartMetric = "revenue" | "receipt" | "expense" | "revenueBalance" | "receiptBalance";
type ChartPoint = { label: string; value: number };
type ChartSlice = { label: string; value: number; color: string };

type RevenueEntry = {
  id: string;
  date: string;
  orderNo: string;
  orderDate: string;
  partner: string;
  amount: number;
  currency: string;
};

type ReceiptEntry = RevenueEntry;

type ExpenseEntry = {
  id: string;
  source: "purchaseOrder" | "payment";
  sourceLabel: string;
  date: string;
  category: string;
  referenceNo: string;
  content: string;
  counterparty: string;
  status: "paid" | "unpaid";
  statusLabel: string;
  amount: number;
  currency: string;
};

type PeriodSummaryRow = {
  id: string;
  period: string;
  orderCount: number;
  revenue: number;
  receipt: number;
  expense: number;
  expenseCount: number;
  revenueBalance: number;
  receiptBalance: number;
};

type CustomerSummaryRow = {
  id: string;
  partner: string;
  orderCount: number;
  shipmentCount: number;
  revenue: number;
  receipt: number;
};

type CategorySummaryRow = {
  id: string;
  category: string;
  expenseCount: number;
  amount: number;
};

const groupUnitOptions: { value: GroupUnit; labelJa: string; labelVi: string }[] = [
  { value: "day", labelJa: "日別", labelVi: "Theo ngày" },
  { value: "week", labelJa: "週別", labelVi: "Theo tuần" },
  { value: "month", labelJa: "月別", labelVi: "Theo tháng" },
];

const financeTabOptions: { value: FinanceTab; labelJa: string; labelVi: string }[] = [
  { value: "period", labelJa: "期間収支", labelVi: "Thu chi theo kỳ" },
  { value: "customer", labelJa: "顧客別売上", labelVi: "Doanh thu theo khách hàng" },
  { value: "category", labelJa: "カテゴリ別支出", labelVi: "Chi phí theo danh mục" },
  { value: "revenue", labelJa: "売上明細", labelVi: "Chi tiết doanh thu" },
  { value: "expense", labelJa: "支出明細", labelVi: "Chi tiết chi phí" },
];

const periodChartOptions: { value: PeriodChartMetric; labelJa: string; labelVi: string }[] = [
  { value: "revenue", labelJa: "売上推移", labelVi: "Xu hướng doanh thu" },
  { value: "receipt", labelJa: "入金推移", labelVi: "Xu hướng thu tiền" },
  { value: "expense", labelJa: "支出推移", labelVi: "Xu hướng chi phí" },
  { value: "revenueBalance", labelJa: "収支差額（売上 - 支出）", labelVi: "Chênh lệch thu chi (doanh thu - chi phí)" },
  { value: "receiptBalance", labelJa: "収支差額（入金 - 支出）", labelVi: "Chênh lệch thu chi (thu tiền - chi phí)" },
];
const defaultPeriodChartSelections: PeriodChartMetric[] = ["revenue", "expense", "revenueBalance"];
const periodChartSelectionsStorageKey = "finance-summary.period-chart-selections";
const periodChartMetricValues = periodChartOptions.map((option) => option.value);

const isPeriodChartMetric = (value: unknown): value is PeriodChartMetric =>
  typeof value === "string" && periodChartMetricValues.includes(value as PeriodChartMetric);

const parsePeriodChartSelections = (value: string | null): PeriodChartMetric[] | null => {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length !== defaultPeriodChartSelections.length) {
      return null;
    }
    if (!parsed.every((item) => isPeriodChartMetric(item))) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const chartPalette = ["#2563eb", "#0ea5e9", "#14b8a6", "#f97316", "#f59e0b", "#ec4899", "#8b5cf6", "#22c55e"];

const truncateChartLabel = (label: string, maxLength = 12) => {
  const trimmed = label.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(maxLength - 1, 1))}...`;
};

const buildRankingChartData = <T,>(
  rows: T[],
  getLabel: (row: T) => string,
  getValue: (row: T) => number,
  maxItems = 8,
): ChartPoint[] =>
  rows
    .map((row) => ({ label: truncateChartLabel(getLabel(row) || "-", 14), value: getValue(row) }))
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
    .map((row) => ({ label: getLabel(row) || "-", value: getValue(row) }))
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

const toMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

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

const toDisplayAmount = (
  amount: number,
  currency: string,
  displayCurrency: CurrencyCode,
  exchangeRates: ExchangeRates,
) => convertFromUsd(convertToUsd(amount, currency, exchangeRates), displayCurrency, exchangeRates);

const compareDateDesc = (left: string, right: string) => right.localeCompare(left);

export default function FinanceSummaryView() {
  const { language, tx } = useLanguage();
  const tr = useCallback((ja: string, vi: string) => (language === "vi" ? vi : ja), [language]);
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [groupUnit, setGroupUnit] = useState<GroupUnit>("month");
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>("USD");
  const [selectedExpenseCategories, setSelectedExpenseCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<FinanceTab>("period");
  const [periodChartSelections, setPeriodChartSelections] = useState<PeriodChartMetric[]>(defaultPeriodChartSelections);
  const [periodChartSelectionsLoaded, setPeriodChartSelectionsLoaded] = useState(false);
  const [salesRows, setSalesRows] = useState<SalesRow[]>([]);
  const [purchaseOrderRows, setPurchaseOrderRows] = useState<OrderRow[]>([]);
  const [paymentRows, setPaymentRows] = useState<PaymentManagementRow[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);
  const [salesLoading, setSalesLoading] = useState(true);
  const [purchaseOrderLoading, setPurchaseOrderLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [purchaseOrderError, setPurchaseOrderError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const paymentRequestIdRef = useRef(0);

  const unsetLabel = tr("未設定", "Chưa thiết lập");
  const otherLabel = tr("その他", "Khác");
  const noDataMessage = tr("指定期間に一致するデータがありません。", "Không có dữ liệu khớp với khoảng thời gian đã chọn.");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedSelections = parsePeriodChartSelections(window.localStorage.getItem(periodChartSelectionsStorageKey));
    if (storedSelections) {
      setPeriodChartSelections(storedSelections);
    }
    setPeriodChartSelectionsLoaded(true);
  }, [tr]);

  useEffect(() => {
    if (!periodChartSelectionsLoaded || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(periodChartSelectionsStorageKey, JSON.stringify(periodChartSelections));
  }, [periodChartSelections, periodChartSelectionsLoaded]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setSalesLoading(true);
        setSalesError(null);
        const fetched = await fetchSalesOrderRows();
        if (!cancelled) {
          setSalesRows(fetched);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setSalesError(error instanceof Error ? error.message : tr("読み込みに失敗しました", "Tải dữ liệu thất bại"));
        }
      } finally {
        if (!cancelled) {
          setSalesLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tr]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setPurchaseOrderLoading(true);
        setPurchaseOrderError(null);
        const fetched = await fetchPurchaseOrderRows();
        if (!cancelled) {
          setPurchaseOrderRows(fetched);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setPurchaseOrderError(error instanceof Error ? error.message : tr("読み込みに失敗しました", "Tải dữ liệu thất bại"));
        }
      } finally {
        if (!cancelled) {
          setPurchaseOrderLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tr]);

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
    const months = getMonthKeys(startDate, endDate);
    const requestId = paymentRequestIdRef.current + 1;
    paymentRequestIdRef.current = requestId;

    if (!months.length) {
      setPaymentRows([]);
      setPaymentLoading(false);
      setPaymentError(null);
      return;
    }

    (async () => {
      try {
        setPaymentLoading(true);
        setPaymentError(null);
        const fetched = await Promise.all(months.map((month) => fetchPaymentManagementRows(month)));
        if (paymentRequestIdRef.current !== requestId) {
          return;
        }
        setPaymentRows(fetched.flat());
      } catch (error) {
        console.error(error);
        if (paymentRequestIdRef.current !== requestId) {
          return;
        }
          setPaymentError(error instanceof Error ? error.message : tr("読み込みに失敗しました", "Tải dữ liệu thất bại"));
      } finally {
        if (paymentRequestIdRef.current === requestId) {
          setPaymentLoading(false);
        }
      }
    })();
  }, [endDate, startDate, tr]);

  const revenueEntries = useMemo<RevenueEntry[]>(
    () =>
      salesRows.flatMap((row) =>
        row.shipments.flatMap((shipment) => {
          const date = shipment.deliveryDate.trim();
          const amount = getShipmentAmount(shipment, row.items);
          if (!date || amount <= 0) {
            return [];
          }
          return [{
            id: `${row.salesOrderId}-shipment-${shipment.id}`,
            date,
            orderNo: row.orderNo.trim() || "-",
            orderDate: row.orderDate.trim(),
            partner: row.customerName.trim() || unsetLabel,
            amount,
            currency: row.currency,
          }];
        }),
      ),
    [salesRows, unsetLabel],
  );

  const receiptEntries = useMemo<ReceiptEntry[]>(
    () =>
      salesRows.flatMap((row) =>
        buildPaidAmountEntries(row.shipments, row.paidAmount, row.paidDate).flatMap((entry, index) => {
          if (!entry.date || entry.amount <= 0) {
            return [];
          }
          return [{
            id: `${row.salesOrderId}-receipt-${index}-${entry.date}`,
            date: entry.date,
            orderNo: row.orderNo.trim() || "-",
            orderDate: row.orderDate.trim(),
            partner: row.customerName.trim() || unsetLabel,
            amount: entry.amount,
            currency: row.currency,
          }];
        }),
      ),
    [salesRows, unsetLabel],
  );

  const purchaseOrderExpenseEntries = useMemo<ExpenseEntry[]>(
    () =>
      purchaseOrderRows
        .filter((row) => row.documentStatus.orderSent)
        .flatMap<ExpenseEntry>((row) => {
          const poLabel = row.poNo.trim() || "-";
          const baseContent = row.note.trim() || tr("発注金額", "Giá trị đơn đặt hàng");
          const counterparty = row.supplier.trim() || unsetLabel;
          const sourceLabel = tr("発注", "Đơn đặt hàng");
          const categoryLabel = tr("発注", "Đơn đặt hàng");

          // 支払い履歴が登録されていれば各支払いを支払日基準で個別エントリ化する
          const validPayments = (row.payments ?? []).filter(
            (payment) => payment.paymentDate.trim() && payment.amount > 0,
          );
          if (validPayments.length > 0) {
            const total = validPayments.length;
            return validPayments.map((payment, index) => {
              const sequenceLabel = `(${index + 1}/${total})`;
              const noteSegment = payment.note?.trim();
              const occurrenceSegment = tr(`${index + 1}回目`, `Lần ${index + 1}`);
              const contentSegments = [baseContent, occurrenceSegment];
              if (noteSegment) {
                contentSegments.push(noteSegment);
              }
              return {
                id: `${row.purchaseOrderId}-payment-${payment.id}`,
                source: "purchaseOrder" as const,
                sourceLabel,
                date: payment.paymentDate.trim(),
                category: categoryLabel,
                referenceNo: `${poLabel} ${sequenceLabel}`,
                content: contentSegments.join(" - "),
                counterparty,
                status: "paid" as const,
                statusLabel: tr("支払済", "Đã thanh toán"),
                amount: payment.amount,
                currency: row.currency,
              };
            });
          }

          // 支払い履歴なしは従来通り発注日基準・全額1件
          return [{
            id: row.purchaseOrderId,
            source: "purchaseOrder" as const,
            sourceLabel,
            date: row.orderDate.trim(),
            category: categoryLabel,
            referenceNo: poLabel,
            content: baseContent,
            counterparty,
            status: row.status.paid ? ("paid" as const) : ("unpaid" as const),
            statusLabel: row.status.paid ? tr("支払済", "Đã thanh toán") : tr("未払い", "Chưa thanh toán"),
            amount: row.amount,
            currency: row.currency,
          }];
        })
        .filter((row) => row.date && row.amount > 0),
    [purchaseOrderRows, tr, unsetLabel],
  );

  const paymentExpenseEntries = useMemo<ExpenseEntry[]>(
    () =>
      paymentRows
        .map((row) => ({
          id: row.paymentId,
          source: "payment" as const,
          sourceLabel: tr("支払い", "Thanh toán"),
          date: row.paymentDate.trim(),
          category: row.category.trim() || unsetLabel,
          referenceNo: "-",
          content: row.content.trim() || "-",
          counterparty: row.transferDestinationName?.trim() || "-",
          status: row.status,
          statusLabel: row.status === "paid" ? tr("支払済", "Đã thanh toán") : tr("未払い", "Chưa thanh toán"),
          amount: row.amount,
          currency: row.currency,
        }))
        .filter((row) => row.date && row.amount > 0),
    [paymentRows, tr, unsetLabel],
  );

  const expenseEntries = useMemo(() => [...purchaseOrderExpenseEntries, ...paymentExpenseEntries], [paymentExpenseEntries, purchaseOrderExpenseEntries]);

  const expenseCategoryOptions = useMemo(() => {
    const set = new Set<string>();
    expenseEntries.forEach((row) => {
      if (row.category) {
        set.add(row.category);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [expenseEntries]);

  const filteredRevenueEntries = useMemo(
    () => revenueEntries.filter((row) => isWithinRange(row.date, startDate, endDate)).sort((a, b) => compareDateDesc(a.date, b.date) || a.orderNo.localeCompare(b.orderNo)),
    [endDate, revenueEntries, startDate],
  );

  const filteredReceiptEntries = useMemo(
    () => receiptEntries.filter((row) => isWithinRange(row.date, startDate, endDate)).sort((a, b) => compareDateDesc(a.date, b.date) || a.orderNo.localeCompare(b.orderNo)),
    [endDate, receiptEntries, startDate],
  );

  const filteredExpenseEntries = useMemo(
    () =>
      expenseEntries
        .filter((row) => isWithinRange(row.date, startDate, endDate))
        .filter((row) => selectedExpenseCategories.length === 0 || selectedExpenseCategories.includes(row.category))
        .sort((a, b) => compareDateDesc(a.date, b.date) || a.category.localeCompare(b.category)),
    [endDate, expenseEntries, selectedExpenseCategories, startDate],
  );

  const revenueTotal = useMemo(() => filteredRevenueEntries.reduce((sum, row) => sum + toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates), 0), [displayCurrency, exchangeRates, filteredRevenueEntries]);
  const receiptTotal = useMemo(() => filteredReceiptEntries.reduce((sum, row) => sum + toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates), 0), [displayCurrency, exchangeRates, filteredReceiptEntries]);
  const expenseTotal = useMemo(() => filteredExpenseEntries.reduce((sum, row) => sum + toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates), 0), [displayCurrency, exchangeRates, filteredExpenseEntries]);

  const revenueBalanceTotal = revenueTotal - expenseTotal;
  const receiptBalanceTotal = receiptTotal - expenseTotal;

  const periodRows = useMemo<PeriodSummaryRow[]>(() => {
    const bucketMap = new Map<string, { label: string; revenue: number; receipt: number; expense: number; expenseCount: number; orderNos: Set<string> }>();

    const ensureBucket = (date: string) => {
      const group = getPeriodGroup(date, groupUnit);
      if (!group) {
        return null;
      }
      const existing = bucketMap.get(group.key) ?? { label: group.label, revenue: 0, receipt: 0, expense: 0, expenseCount: 0, orderNos: new Set<string>() };
      bucketMap.set(group.key, existing);
      return existing;
    };

    filteredRevenueEntries.forEach((row) => {
      const bucket = ensureBucket(row.date);
      if (!bucket) {
        return;
      }
      bucket.revenue += toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates);
      bucket.orderNos.add(row.orderNo);
    });

    filteredReceiptEntries.forEach((row) => {
      const bucket = ensureBucket(row.date);
      if (!bucket) {
        return;
      }
      bucket.receipt += toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates);
    });

    filteredExpenseEntries.forEach((row) => {
      const bucket = ensureBucket(row.date);
      if (!bucket) {
        return;
      }
      bucket.expense += toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates);
      bucket.expenseCount += 1;
    });

    return Array.from(bucketMap.entries())
      .map(([key, bucket]) => ({
        id: key,
        period: bucket.label,
        orderCount: bucket.orderNos.size,
        revenue: bucket.revenue,
        receipt: bucket.receipt,
        expense: bucket.expense,
        expenseCount: bucket.expenseCount,
        revenueBalance: bucket.revenue - bucket.expense,
        receiptBalance: bucket.receipt - bucket.expense,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [displayCurrency, exchangeRates, filteredExpenseEntries, filteredReceiptEntries, filteredRevenueEntries, groupUnit]);

  const customerSummaryRows = useMemo<CustomerSummaryRow[]>(() => {
    const map = new Map<string, { partner: string; orderNos: Set<string>; shipmentCount: number; revenue: number; receipt: number }>();

    filteredRevenueEntries.forEach((row) => {
      const entry = map.get(row.partner) ?? { partner: row.partner, orderNos: new Set<string>(), shipmentCount: 0, revenue: 0, receipt: 0 };
      entry.orderNos.add(row.orderNo);
      entry.shipmentCount += 1;
      entry.revenue += toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates);
      map.set(row.partner, entry);
    });

    filteredReceiptEntries.forEach((row) => {
      const entry = map.get(row.partner) ?? { partner: row.partner, orderNos: new Set<string>(), shipmentCount: 0, revenue: 0, receipt: 0 };
      entry.orderNos.add(row.orderNo);
      entry.receipt += toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates);
      map.set(row.partner, entry);
    });

    return Array.from(map.values())
      .map((row) => ({ id: row.partner, partner: row.partner, orderCount: row.orderNos.size, shipmentCount: row.shipmentCount, revenue: row.revenue, receipt: row.receipt }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [displayCurrency, exchangeRates, filteredReceiptEntries, filteredRevenueEntries]);

  const categorySummaryRows = useMemo<CategorySummaryRow[]>(() => {
    const map = new Map<string, { category: string; expenseCount: number; amount: number }>();
    filteredExpenseEntries.forEach((row) => {
      const entry = map.get(row.category) ?? { category: row.category, expenseCount: 0, amount: 0 };
      entry.expenseCount += 1;
      entry.amount += toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates);
      map.set(row.category, entry);
    });
    return Array.from(map.values()).map((row) => ({ id: row.category, category: row.category, expenseCount: row.expenseCount, amount: row.amount })).sort((a, b) => b.amount - a.amount);
  }, [displayCurrency, exchangeRates, filteredExpenseEntries]);

  const periodRevenueChartData = useMemo(() => periodRows.map((row) => ({ label: truncateChartLabel(row.period, 16), value: row.revenue })), [periodRows]);
  const periodReceiptChartData = useMemo(() => periodRows.map((row) => ({ label: truncateChartLabel(row.period, 16), value: row.receipt })), [periodRows]);
  const periodExpenseChartData = useMemo(() => periodRows.map((row) => ({ label: truncateChartLabel(row.period, 16), value: row.expense })), [periodRows]);
  const periodRevenueBalanceChartData = useMemo(() => periodRows.map((row) => ({ label: truncateChartLabel(row.period, 16), value: row.revenueBalance })), [periodRows]);
  const periodReceiptBalanceChartData = useMemo(() => periodRows.map((row) => ({ label: truncateChartLabel(row.period, 16), value: row.receiptBalance })), [periodRows]);
  const customerRevenueChartData = useMemo(() => buildRankingChartData(customerSummaryRows, (row) => row.partner, (row) => row.revenue), [customerSummaryRows]);
  const categoryExpenseChartData = useMemo(() => buildRankingChartData(categorySummaryRows, (row) => tx(row.category), (row) => row.amount), [categorySummaryRows, tx]);
  const customerRevenueSlices = useMemo(() => buildPieChartSlices(customerSummaryRows, (row) => row.partner, (row) => row.revenue, otherLabel), [customerSummaryRows, otherLabel]);
  const categoryExpenseSlices = useMemo(() => buildPieChartSlices(categorySummaryRows, (row) => tx(row.category), (row) => row.amount, otherLabel), [categorySummaryRows, otherLabel, tx]);

  const handleStartDateChange = (value: string) => {
    const normalizedValue = normalizeDateInputValue(value);
    setStartDate(normalizedValue);
    if (endDate && normalizedValue && normalizedValue > endDate) {
      setEndDate(normalizedValue);
    }
  };

  const handleEndDateChange = (value: string) => {
    const normalizedValue = normalizeDateInputValue(value);
    setEndDate(normalizedValue);
    if (startDate && normalizedValue && normalizedValue < startDate) {
      setStartDate(normalizedValue);
    }
  };

  const handleReset = () => {
    setStartDate(defaultRange.startDate);
    setEndDate(defaultRange.endDate);
    setGroupUnit("month");
    setDisplayCurrency("USD");
    setSelectedExpenseCategories([]);
    setActiveTab("period");
    setPeriodChartSelections(defaultPeriodChartSelections);
  };

  const renderPieLegend = (slices: ChartSlice[]) => {
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
                <span className="font-medium text-gray-700">{formatCurrencyValue(displayCurrency, slice.value)}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPieChartBody = (slices: ChartSlice[]) => {
    if (slices.length) {
      return (
        <div className="flex justify-center">
          <PieChart data={slices} size={176} strokeWidth={1} />
        </div>
      );
    }
    return <div className="flex h-44 items-center justify-center text-sm text-gray-400">{noDataMessage}</div>;
  };

  const renderChartCard = (title: ReactNode, description: string, chart: ReactNode, legend?: ReactNode, badge?: string) => (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-sm font-semibold text-gray-700">{title}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
        {badge ? <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-500">{badge}</span> : null}
      </div>
      <div className="mt-4">{chart}</div>
      {legend ? <div className="mt-4 border-t border-gray-100 pt-4">{legend}</div> : null}
    </div>
  );

  const periodColumns: TableColumn<PeriodSummaryRow>[] = [
    { key: "period", header: tr("期間", "Kỳ"), render: (row) => <span className="text-sm font-semibold">{row.period}</span> },
    { key: "orderCount", header: tr("売上PO数", "Số PO doanh thu"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.orderCount)}</span> },
    { key: "revenue", header: `${tr("売上金額", "Doanh thu")} (${displayCurrency})`, align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, row.revenue)}</span> },
    { key: "receipt", header: `${tr("入金金額", "Tiền thu")} (${displayCurrency})`, align: "right", render: (row) => <span className="text-sm text-emerald-700">{formatCurrencyValue(displayCurrency, row.receipt)}</span> },
    { key: "expense", header: `${tr("支出金額", "Chi phí")} (${displayCurrency})`, align: "right", render: (row) => <span className="text-sm text-rose-700">{formatCurrencyValue(displayCurrency, row.expense)}</span> },
    { key: "expenseCount", header: tr("支出件数", "Số khoản chi"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.expenseCount)}</span> },
    { key: "revenueBalance", header: `${tr("収支差額（売上 - 支出）", "Chênh lệch thu chi (doanh thu - chi phí)")} (${displayCurrency})`, align: "right", render: (row) => <span className={`text-sm font-semibold ${row.revenueBalance >= 0 ? "text-blue-700" : "text-rose-700"}`}>{formatCurrencyValue(displayCurrency, row.revenueBalance)}</span> },
    { key: "receiptBalance", header: `${tr("収支差額（入金 - 支出）", "Chênh lệch thu chi (thu tiền - chi phí)")} (${displayCurrency})`, align: "right", render: (row) => <span className={`text-sm font-semibold ${row.receiptBalance >= 0 ? "text-blue-700" : "text-rose-700"}`}>{formatCurrencyValue(displayCurrency, row.receiptBalance)}</span> },
  ];

  const customerColumns: TableColumn<CustomerSummaryRow>[] = [
    { key: "partner", header: tr("顧客名", "Khách hàng"), render: (row) => <span className="text-sm font-semibold">{row.partner}</span> },
    { key: "orderCount", header: tr("売上PO数", "Số PO doanh thu"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.orderCount)}</span> },
    { key: "shipmentCount", header: tr("出荷件数", "Số lần xuất hàng"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.shipmentCount)}</span> },
    { key: "revenue", header: `${tr("売上金額", "Doanh thu")} (${displayCurrency})`, align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, row.revenue)}</span> },
    { key: "receipt", header: `${tr("入金金額", "Tiền thu")} (${displayCurrency})`, align: "right", render: (row) => <span className="text-sm text-emerald-700">{formatCurrencyValue(displayCurrency, row.receipt)}</span> },
  ];

  const categoryColumns: TableColumn<CategorySummaryRow>[] = [
    { key: "category", header: tr("カテゴリ", "Danh mục"), render: (row) => <span className="text-sm font-semibold">{tx(row.category)}</span> },
    { key: "expenseCount", header: tr("支出件数", "Số khoản chi"), align: "right", render: (row) => <span className="text-sm">{formatNumberValue(row.expenseCount)}</span> },
    { key: "amount", header: `${tr("支出金額", "Chi phí")} (${displayCurrency})`, align: "right", render: (row) => <span className="text-sm font-semibold text-rose-700">{formatCurrencyValue(displayCurrency, row.amount)}</span> },
  ];

  const revenueColumns: TableColumn<RevenueEntry>[] = [
    { key: "date", header: tr("出荷日", "Ngày xuất hàng"), render: (row) => <span className="text-sm">{row.date}</span> },
    { key: "orderNo", header: "PO No.", render: (row) => <span className="text-sm font-semibold text-blue-600">{row.orderNo}</span> },
    { key: "orderDate", header: tr("受注日", "Ngày nhận đơn"), render: (row) => <span className="text-sm">{row.orderDate}</span> },
    { key: "partner", header: tr("顧客名", "Khách hàng"), render: (row) => <span className="text-sm font-semibold">{row.partner}</span> },
    { key: "amount", header: `${tr("売上金額", "Doanh thu")} (${displayCurrency})`, align: "right", render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates))}</span> },
  ];

  const expenseColumns: TableColumn<ExpenseEntry>[] = [
    { key: "sourceLabel", header: tr("区分", "Loại"), render: (row) => <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${row.source === "purchaseOrder" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-700"}`}>{row.sourceLabel}</span> },
    { key: "date", header: tr("支出日", "Ngày chi"), render: (row) => <span className="text-sm">{row.date}</span> },
    { key: "referenceNo", header: tr("伝票No.", "Số chứng từ"), render: (row) => <span className="text-sm font-semibold text-blue-600">{row.referenceNo}</span> },
    { key: "category", header: tr("カテゴリ", "Danh mục"), render: (row) => <span className="text-sm font-semibold">{tx(row.category)}</span> },
    { key: "content", header: tr("内容", "Nội dung"), render: (row) => <span className="text-sm">{tx(row.content)}</span> },
    { key: "counterparty", header: tr("支出先", "Đối tác chi"), render: (row) => <span className="text-sm">{row.counterparty}</span> },
    { key: "statusLabel", header: tr("ステータス", "Trạng thái"), render: (row) => <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${row.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row.statusLabel}</span> },
    { key: "amount", header: `${tr("支出金額", "Chi phí")} (${displayCurrency})`, align: "right", render: (row) => <span className="text-sm font-semibold text-rose-700">{formatCurrencyValue(displayCurrency, toDisplayAmount(row.amount, row.currency, displayCurrency, exchangeRates))}</span> },
  ];

  const summaryCards = [
    { label: `${tr("売上金額", "Doanh thu")} (${displayCurrency})`, value: formatCurrencyValue(displayCurrency, revenueTotal), valueClassName: "text-gray-900" },
    { label: `${tr("入金金額", "Tiền thu")} (${displayCurrency})`, value: formatCurrencyValue(displayCurrency, receiptTotal), valueClassName: "text-emerald-700" },
    { label: `${tr("支出金額", "Chi phí")} (${displayCurrency})`, value: formatCurrencyValue(displayCurrency, expenseTotal), valueClassName: "text-rose-700" },
    { label: `${tr("収支差額（売上 - 支出）", "Chênh lệch thu chi (doanh thu - chi phí)")} (${displayCurrency})`, value: formatCurrencyValue(displayCurrency, revenueBalanceTotal), valueClassName: revenueBalanceTotal >= 0 ? "text-blue-700" : "text-rose-700" },
    { label: `${tr("収支差額（入金 - 支出）", "Chênh lệch thu chi (thu tiền - chi phí)")} (${displayCurrency})`, value: formatCurrencyValue(displayCurrency, receiptBalanceTotal), valueClassName: receiptBalanceTotal >= 0 ? "text-blue-700" : "text-rose-700" },
  ];

  const notes = [
    tr("売上: 出荷日ベース", "Doanh thu: theo ngày xuất hàng"),
    tr("入金: 入金日ベース", "Tiền thu: theo ngày thu tiền"),
    tr(
      "支出: 発注は支払い履歴があれば支払日、なければ発注日。支払い管理は支払日",
      "Chi phí: đơn đặt hàng theo ngày chi nếu có lịch sử thanh toán, nếu không thì theo ngày đặt. Quản lý thanh toán theo ngày chi",
    ),
    tr("支出には確定済み発注金額と支払い管理の支出を含みます", "Chi phí bao gồm giá trị đơn đặt hàng đã xác định và các khoản chi trong quản lý thanh toán"),
    tr("差額はセレクトボックスで切り替えて確認できます", "Có thể chuyển đổi cách xem chênh lệch bằng hộp chọn"),
    `1 USD = ${formatNumberValue(exchangeRates.jpyPerUsd)} JPY / ${formatNumberValue(exchangeRates.vndPerUsd)} VND`,
  ];

  const loading = salesLoading || purchaseOrderLoading || paymentLoading;
  const groupUnitLabel = groupUnitOptions.find((option) => option.value === groupUnit)?.[language === "vi" ? "labelVi" : "labelJa"] ?? "";

  const getPeriodChartConfig = useCallback((metric: PeriodChartMetric) => {
    switch (metric) {
      case "receipt":
        return { title: tr("入金推移", "Xu hướng thu tiền"), data: periodReceiptChartData, barColor: "#a7f3d0", lineColor: "#059669" };
      case "expense":
        return { title: tr("支出推移", "Xu hướng chi phí"), data: periodExpenseChartData, barColor: "#fecdd3", lineColor: "#e11d48" };
      case "revenueBalance":
        return { title: tr("収支差額（売上 - 支出）", "Chênh lệch thu chi (doanh thu - chi phí)"), data: periodRevenueBalanceChartData, barColor: "#ddd6fe", lineColor: "#7c3aed" };
      case "receiptBalance":
        return { title: tr("収支差額（入金 - 支出）", "Chênh lệch thu chi (thu tiền - chi phí)"), data: periodReceiptBalanceChartData, barColor: "#fde68a", lineColor: "#d97706" };
      case "revenue":
      default:
        return { title: tr("売上推移", "Xu hướng doanh thu"), data: periodRevenueChartData, barColor: "#bfdbfe", lineColor: "#2563eb" };
    }
  }, [periodExpenseChartData, periodReceiptBalanceChartData, periodReceiptChartData, periodRevenueBalanceChartData, periodRevenueChartData, tr]);

  const handlePeriodChartChange = (index: number, value: PeriodChartMetric) => {
    setPeriodChartSelections((current) => current.map((metric, currentIndex) => (currentIndex === index ? value : metric)));
  };

  const tabContent = (() => {
    switch (activeTab) {
      case "customer":
        return (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 xl:grid-cols-2">
              {renderChartCard(
                tr("顧客別売上構成", "Cơ cấu doanh thu theo khách hàng"),
                tr("売上金額の構成比を上位顧客中心に表示します。", "Hiển thị tỷ trọng doanh thu, tập trung vào các khách hàng hàng đầu."),
                renderPieChartBody(customerRevenueSlices),
                renderPieLegend(customerRevenueSlices),
                tr("上位7件", "7 mục hàng đầu"),
              )}
              {renderChartCard(
                tr("顧客別売上ランキング", "Xếp hạng doanh thu theo khách hàng"),
                tr("表示通貨に換算した売上金額の上位顧客を表示します。", "Hiển thị các khách hàng có doanh thu cao nhất sau khi quy đổi sang tiền tệ hiển thị."),
                <BarLineChart data={customerRevenueChartData} height={260} barColor="#bfdbfe" lineColor="#2563eb" unitLabel={displayCurrency} />,
                undefined,
                tr("上位7件", "7 mục hàng đầu"),
              )}
            </div>
            <Paper variant="outlined" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 space-y-1">
                <div className="text-sm font-semibold text-gray-700">{tr("顧客別売上一覧", "Danh sách doanh thu theo khách hàng")}</div>
                <div className="text-xs text-gray-500">{tr("売上・入金の実績を顧客単位で確認できます。", "Có thể kiểm tra doanh thu và thu tiền theo từng khách hàng.")}</div>
              </div>
              <DataTable columns={customerColumns} rows={customerSummaryRows} getRowId={(row) => row.id} enableHorizontalScroll defaultRowsPerPage={10} />
            </Paper>
          </div>
        );
      case "category":
        return (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 xl:grid-cols-2">
              {renderChartCard(
                tr("カテゴリ別支出構成", "Cơ cấu chi phí theo danh mục"),
                tr("支出金額の構成比をカテゴリ別に表示します。", "Hiển thị tỷ trọng chi phí theo từng danh mục."),
                renderPieChartBody(categoryExpenseSlices),
                renderPieLegend(categoryExpenseSlices),
                tr("上位7件", "7 mục hàng đầu"),
              )}
              {renderChartCard(
                tr("カテゴリ別支出ランキング", "Xếp hạng chi phí theo danh mục"),
                tr("発注と支払いを統合した支出金額の上位カテゴリです。", "Hiển thị các danh mục chi phí cao nhất, gộp cả đơn đặt hàng và thanh toán."),
                <BarLineChart data={categoryExpenseChartData} height={260} barColor="#fecdd3" lineColor="#e11d48" unitLabel={displayCurrency} />,
                undefined,
                tr("上位7件", "7 mục hàng đầu"),
              )}
            </div>
            <Paper variant="outlined" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 space-y-1">
                <div className="text-sm font-semibold text-gray-700">{tr("カテゴリ別支出一覧", "Danh sách chi phí theo danh mục")}</div>
                <div className="text-xs text-gray-500">{tr("発注金額と支払い管理の支出をカテゴリ単位で集計しています。", "Tổng hợp giá trị đơn đặt hàng và chi phí quản lý thanh toán theo từng danh mục.")}</div>
              </div>
              <DataTable columns={categoryColumns} rows={categorySummaryRows} getRowId={(row) => row.id} enableHorizontalScroll defaultRowsPerPage={10} />
            </Paper>
          </div>
        );
      case "revenue":
        return (
          <Paper variant="outlined" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 space-y-1">
              <div className="text-sm font-semibold text-gray-700">{tr("売上明細", "Chi tiết doanh thu")}</div>
              <div className="text-xs text-gray-500">{tr("出荷日ベースで売上を表示します。金額は表示通貨に換算しています。", "Hiển thị doanh thu theo ngày xuất hàng. Số tiền đã được quy đổi sang tiền tệ hiển thị.")}</div>
            </div>
            <DataTable columns={revenueColumns} rows={filteredRevenueEntries} getRowId={(row) => row.id} enableHorizontalScroll defaultRowsPerPage={10} />
          </Paper>
        );
      case "expense":
        return (
          <Paper variant="outlined" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 space-y-1">
              <div className="text-sm font-semibold text-gray-700">{tr("支出明細", "Chi tiết chi phí")}</div>
              <div className="text-xs text-gray-500">{tr("発注と支払いを統合した支出明細です。金額は表示通貨に換算しています。", "Đây là chi tiết chi phí gộp từ đơn đặt hàng và thanh toán. Số tiền đã được quy đổi sang tiền tệ hiển thị.")}</div>
            </div>
            <DataTable columns={expenseColumns} rows={filteredExpenseEntries} getRowId={(row) => row.id} enableHorizontalScroll defaultRowsPerPage={10} />
          </Paper>
        );
      case "period":
      default:
        return (
          <div className="flex flex-col gap-4">
            <Paper variant="outlined" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-gray-700">{tr("期間収支サマリー", "Tóm tắt thu chi theo kỳ")}</div>
                  <div className="text-xs text-gray-500">{tr("3つのグラフを横並びで比較しながら、各カード内で表示内容を切り替えできます。", "Có thể so sánh 3 biểu đồ song song và chuyển nội dung hiển thị trong từng thẻ.")}</div>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {periodChartSelections.map((selectedChart, index) => {
                    const chartConfig = getPeriodChartConfig(selectedChart);
                    return (
                      <div key={`period-chart-${index}`}>
                        {renderChartCard(
                          <div className="w-full max-w-xs">
                            <Select
                              fullWidth
                              size="small"
                              value={selectedChart}
                              onChange={(event) => handlePeriodChartChange(index, event.target.value as PeriodChartMetric)}
                            >
                              {periodChartOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                  {language === "vi" ? option.labelVi : option.labelJa}
                                </MenuItem>
                              ))}
                            </Select>
                          </div>,
                          tr("選択期間を集計単位ごとにまとめた推移です。", "Đây là xu hướng được tổng hợp theo đơn vị gom trong khoảng thời gian đã chọn."),
                          <BarLineChart
                            data={chartConfig.data}
                            height={280}
                            barColor={chartConfig.barColor}
                            lineColor={chartConfig.lineColor}
                            unitLabel={displayCurrency}
                          />,
                          undefined,
                          groupUnitLabel,
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Paper>
            <Paper variant="outlined" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 space-y-1">
                <div className="text-sm font-semibold text-gray-700">{tr("期間別一覧", "Danh sách theo kỳ")}</div>
                <div className="text-xs text-gray-500">{tr("選択した集計単位で売上・入金・支出・差額を一覧表示します。", "Hiển thị danh sách doanh thu, thu tiền, chi phí và chênh lệch theo đơn vị gom đã chọn.")}</div>
              </div>
              <DataTable columns={periodColumns} rows={periodRows} getRowId={(row) => row.id} enableHorizontalScroll defaultRowsPerPage={12} />
            </Paper>
          </div>
        );
    }
  })();

  return (
    <div className="flex flex-col gap-5">
      {salesError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{salesError}</div> : null}
      {purchaseOrderError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{purchaseOrderError}</div> : null}
      {paymentError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{paymentError}</div> : null}

      <Paper variant="outlined" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-4">
          <TextField
            label={tr("開始日", "Ngày bắt đầu")}
            type="date"
            size="small"
            value={startDate}
            onChange={(event) => handleStartDateChange(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={tr("終了日", "Ngày kết thúc")}
            type="date"
            size="small"
            value={endDate}
            onChange={(event) => handleEndDateChange(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            label={tr("集計単位", "Đơn vị tổng hợp")}
            size="small"
            value={groupUnit}
            onChange={(event) => setGroupUnit(event.target.value as GroupUnit)}
          >
            {groupUnitOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {language === "vi" ? option.labelVi : option.labelJa}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={tr("表示通貨", "Tiền tệ hiển thị")}
            size="small"
            value={displayCurrency}
            onChange={(event) => setDisplayCurrency(event.target.value as CurrencyCode)}
          >
            {CURRENCY_OPTION_ITEMS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-500">{tr("集計範囲や表示通貨を変えると、サマリー・グラフ・一覧がまとめて切り替わります。", "Khi thay đổi khoảng tổng hợp hoặc tiền tệ hiển thị, phần tóm tắt, biểu đồ và danh sách sẽ được cập nhật đồng thời.")}</div>
          <Button variant="outlined" size="small" onClick={handleReset}>
            {tr("今月に戻す", "Quay về tháng này")}
          </Button>
        </div>
      </Paper>

      <div className="flex flex-wrap gap-2">
        {notes.map((note) => (
          <div key={note} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {note}
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <Paper key={card.label} variant="outlined" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-500">{card.label}</div>
            <div className={`mt-2 text-2xl font-semibold ${card.valueClassName}`}>{card.value}</div>
          </Paper>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {financeTabOptions.map((option) => {
          const isActive = activeTab === option.value;
          return (
            <Button
              key={option.value}
              variant={isActive ? "contained" : "outlined"}
              size="small"
              onClick={() => setActiveTab(option.value)}
              className={isActive ? "!bg-blue-600 !text-white hover:!bg-blue-700" : ""}
            >
              {language === "vi" ? option.labelVi : option.labelJa}
            </Button>
          );
        })}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">{tr("カテゴリ選択（支出）", "Chọn danh mục (chi phí)")}</span>
          <Select
            size="small"
            multiple
            displayEmpty
            value={selectedExpenseCategories}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedExpenseCategories(typeof value === "string" ? value.split(",") : value);
            }}
            sx={{ minWidth: { xs: 200, sm: 280 } }}
            renderValue={(selected) => {
              if (!selected.length) {
                return <span className="text-gray-400">{tr("すべて", "Tất cả")}</span>;
              }
              return selected.map((value) => tx(value)).join(", ");
            }}
          >
            {expenseCategoryOptions.length === 0 ? (
              <MenuItem disabled value="">
                <ListItemText primary={tr("カテゴリなし", "Không có danh mục")} />
              </MenuItem>
            ) : (
              expenseCategoryOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  <Checkbox checked={selectedExpenseCategories.includes(option)} />
                  <ListItemText primary={tx(option)} />
                </MenuItem>
              ))
            )}
          </Select>
        </div>
      </div>

      {loading ? (
        <Paper variant="outlined" className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          {tr("集計データを読み込んでいます。", "Đang tải dữ liệu tổng hợp.")}
        </Paper>
      ) : (
        tabContent
      )}
    </div>
  );
}
