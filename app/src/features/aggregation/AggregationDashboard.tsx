"use client";
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, ListItemText, MenuItem, Paper, Select, TextField } from "@mui/material";
import DataTable, { TableColumn } from "@/components/DataTable";
import BarLineChart from "@/components/charts/BarLineChart";
import PieChart from "@/components/charts/PieChart";
import { CURRENCY_OPTION_ITEMS, type CurrencyCode } from "@/constants/currency";
import type { ExchangeRates } from "@/features/settings/types";
import {
  convertFromUsd,
  convertToUsd,
  formatCurrencyValue,
  formatNumberValue,
  getCurrentMonthRange,
  getPeriodGroup,
  type GroupUnit,
  isWithinRange,
} from "@/features/aggregation/aggregationUtils";

type AggregationRow = {
  id: string;
  date: string;
  partner: string;
  currency: string;
  amount: number;
  confirmed: boolean;
};

type AggregationDashboardProps = {
  rows: AggregationRow[];
  partnerLabel: string;
  dateLabel: string;
  confirmedLabel: string;
  exchangeRates: ExchangeRates;
  initialStartDate?: string;
  initialEndDate?: string;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  scopeNotes?: string[];
};

type PeriodSummaryRow = {
  id: string;
  period: string;
  count: number;
  partnerCount: number;
  total: number;
  average: number;
  sortKey: number;
};

type PartnerSummaryRow = {
  id: string;
  partner: string;
  count: number;
  total: number;
  average: number;
};

type PeriodAccumulator = {
  id: string;
  label: string;
  sortKey: number;
  count: number;
  totalUsd: number;
  partners: Set<string>;
};

type ChartSlice = {
  label: string;
  value: number;
  color?: string;
  percent: number;
};

const chartColors = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#f97316",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#22c55e",
];

const groupUnitOptions: { value: GroupUnit; label: string }[] = [
  { value: "day", label: "日別" },
  { value: "week", label: "週別" },
  { value: "month", label: "月別" },
];

export default function AggregationDashboard({
  rows,
  partnerLabel,
  dateLabel,
  confirmedLabel,
  exchangeRates,
  initialStartDate,
  initialEndDate,
  onDateRangeChange,
  scopeNotes,
}: AggregationDashboardProps) {
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [startDate, setStartDate] = useState(initialStartDate ?? defaultRange.startDate);
  const [endDate, setEndDate] = useState(initialEndDate ?? defaultRange.endDate);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [groupUnit, setGroupUnit] = useState<GroupUnit>("month");
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>("USD");

  const partnerOptions = useMemo(() => {
    const names = Array.from(new Set(rows.map((row) => row.partner.trim()).filter(Boolean)));
    names.sort((a, b) => a.localeCompare(b, "ja"));
    return names;
  }, [rows]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (!row.confirmed) {
          return false;
        }
        if (!isWithinRange(row.date, startDate, endDate)) {
          return false;
        }
        if (selectedPartners.length && !selectedPartners.includes(row.partner)) {
          return false;
        }
        return true;
      }),
    [endDate, rows, selectedPartners, startDate],
  );

  useEffect(() => {
    if (onDateRangeChange) {
      onDateRangeChange(startDate, endDate);
    }
  }, [endDate, onDateRangeChange, startDate]);

  const totalUsd = useMemo(
    () => filteredRows.reduce((sum, row) => sum + convertToUsd(row.amount, row.currency, exchangeRates), 0),
    [exchangeRates, filteredRows],
  );
  const displayTotal = useMemo(
    () => convertFromUsd(totalUsd, displayCurrency, exchangeRates),
    [displayCurrency, exchangeRates, totalUsd],
  );
  const averageTotal = filteredRows.length ? displayTotal / filteredRows.length : 0;
  const uniquePartnerCount = useMemo(
    () => new Set(filteredRows.map((row) => row.partner).filter(Boolean)).size,
    [filteredRows],
  );

  const periodRows = useMemo<PeriodSummaryRow[]>(() => {
    const map = new Map<string, PeriodAccumulator>();
    filteredRows.forEach((row) => {
      const period = getPeriodGroup(row.date, groupUnit);
      if (!period) {
        return;
      }
      const entry =
        map.get(period.key) ??
        ({
          id: period.key,
          label: period.label,
          sortKey: period.sortKey,
          count: 0,
          totalUsd: 0,
          partners: new Set<string>(),
        } as PeriodAccumulator);
      entry.count += 1;
      entry.totalUsd += convertToUsd(row.amount, row.currency, exchangeRates);
      if (row.partner) {
        entry.partners.add(row.partner);
      }
      map.set(period.key, entry);
    });
    return Array.from(map.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((entry) => {
        const total = convertFromUsd(entry.totalUsd, displayCurrency, exchangeRates);
        return {
          id: entry.id,
          period: entry.label,
          count: entry.count,
          partnerCount: entry.partners.size,
          total,
          average: entry.count ? total / entry.count : 0,
          sortKey: entry.sortKey,
        };
      });
  }, [displayCurrency, exchangeRates, filteredRows, groupUnit]);

  const partnerRows = useMemo<PartnerSummaryRow[]>(() => {
    const map = new Map<string, { partner: string; count: number; totalUsd: number }>();
    filteredRows.forEach((row) => {
      const name = row.partner.trim() || "未設定";
      const entry = map.get(name) ?? { partner: name, count: 0, totalUsd: 0 };
      entry.count += 1;
      entry.totalUsd += convertToUsd(row.amount, row.currency, exchangeRates);
      map.set(name, entry);
    });
    return Array.from(map.values())
      .map((entry) => {
        const total = convertFromUsd(entry.totalUsd, displayCurrency, exchangeRates);
        return {
          id: entry.partner,
          partner: entry.partner,
          count: entry.count,
          total,
          average: entry.count ? total / entry.count : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [displayCurrency, exchangeRates, filteredRows]);

  const groupUnitLabel = useMemo(
    () => groupUnitOptions.find((option) => option.value === groupUnit)?.label ?? "月別",
    [groupUnit],
  );

  const trendData = useMemo(
    () => periodRows.map((row) => ({ label: row.period, value: row.total })),
    [periodRows],
  );

  const pieSlices = useMemo<ChartSlice[]>(() => {
    const total = partnerRows.reduce((sum, row) => sum + row.total, 0);
    if (!total) {
      return [];
    }
    const maxItems = 6;
    const sorted = [...partnerRows].sort((a, b) => b.total - a.total);
    const topItems = sorted.slice(0, maxItems);
    const otherItems = sorted.slice(maxItems);
    const otherTotal = otherItems.reduce((sum, row) => sum + row.total, 0);
    const base = topItems.map((row, index) => ({
      label: row.partner || "未設定",
      value: row.total,
      percent: (row.total / total) * 100,
      color: chartColors[index % chartColors.length],
    }));
    if (otherTotal > 0) {
      base.push({
        label: "その他",
        value: otherTotal,
        percent: (otherTotal / total) * 100,
        color: chartColors[base.length % chartColors.length],
      });
    }
    return base;
  }, [partnerRows]);

  const periodColumns = useMemo<TableColumn<PeriodSummaryRow>[]>(
    () => [
      { key: "period", header: "期間", render: (row) => <span className="text-sm">{row.period}</span> },
      {
        key: "count",
        header: "件数",
        align: "right",
        render: (row) => <span className="text-sm">{formatNumberValue(row.count)}</span>,
      },
      {
        key: "partnerCount",
        header: `${partnerLabel}数`,
        align: "right",
        render: (row) => <span className="text-sm">{formatNumberValue(row.partnerCount)}</span>,
      },
      {
        key: "total",
        header: `合計金額 (${displayCurrency})`,
        align: "right",
        render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, row.total)}</span>,
      },
      {
        key: "average",
        header: `平均金額 (${displayCurrency}/件)`,
        align: "right",
        render: (row) => <span className="text-sm">{formatCurrencyValue(displayCurrency, row.average)}</span>,
      },
    ],
    [displayCurrency, partnerLabel],
  );

  const partnerColumns = useMemo<TableColumn<PartnerSummaryRow>[]>(
    () => [
      {
        key: "partner",
        header: partnerLabel,
        render: (row) => <span className="text-sm font-semibold">{row.partner}</span>,
      },
      {
        key: "count",
        header: "件数",
        align: "right",
        render: (row) => <span className="text-sm">{formatNumberValue(row.count)}</span>,
      },
      {
        key: "total",
        header: `合計金額 (${displayCurrency})`,
        align: "right",
        render: (row) => <span className="text-sm font-semibold">{formatCurrencyValue(displayCurrency, row.total)}</span>,
      },
      {
        key: "average",
        header: `平均金額 (${displayCurrency}/件)`,
        align: "right",
        render: (row) => <span className="text-sm">{formatCurrencyValue(displayCurrency, row.average)}</span>,
      },
    ],
    [displayCurrency, partnerLabel],
  );

  const handleReset = () => {
    const range = getCurrentMonthRange();
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setSelectedPartners([]);
    setGroupUnit("month");
    setDisplayCurrency("USD");
  };

  const rateNote = `1 USD = ${formatNumberValue(exchangeRates.jpyPerUsd)} JPY / ${formatNumberValue(
    exchangeRates.vndPerUsd,
  )} VND`;

  const scopeNoteItems = useMemo(() => {
    const base = scopeNotes ?? [
      `集計対象: 確定のみ（${confirmedLabel}）`,
      `期間基準: ${dateLabel}`,
      "換算レート: 集計時点",
    ];
    return [...base, rateNote];
  }, [confirmedLabel, dateLabel, rateNote, scopeNotes]);

  const summaryItems = [
    { label: `合計金額 (${displayCurrency})`, value: formatCurrencyValue(displayCurrency, displayTotal) },
    { label: "件数", value: formatNumberValue(filteredRows.length) },
    { label: `${partnerLabel}数`, value: formatNumberValue(uniquePartnerCount) },
    {
      label: `平均金額 (${displayCurrency}/件)`,
      value: formatCurrencyValue(displayCurrency, averageTotal),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Paper elevation={0} className="border border-gray-200 rounded-xl p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">期間</span>
              <div className="flex items-center gap-2">
                <TextField
                  size="small"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
                <span className="text-gray-400">〜</span>
                <TextField
                  size="small"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">{partnerLabel}</span>
              <Select
                size="small"
                multiple
                displayEmpty
                value={selectedPartners}
                onChange={(event) => setSelectedPartners(event.target.value as string[])}
                sx={{ minWidth: { xs: 200, sm: 240 } }}
                renderValue={(selected) => {
                  if (!selected.length) {
                    return <span className="text-gray-400">すべて</span>;
                  }
                  return selected.join(", ");
                }}
              >
                {partnerOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    <Checkbox checked={selectedPartners.includes(option)} />
                    <ListItemText primary={option} />
                  </MenuItem>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">集計単位</span>
              <Select
                size="small"
                value={groupUnit}
                onChange={(event) => setGroupUnit(event.target.value as GroupUnit)}
                sx={{ minWidth: 140 }}
              >
                {groupUnitOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">表示通貨</span>
              <Select
                size="small"
                value={displayCurrency}
                onChange={(event) => setDisplayCurrency(event.target.value as CurrencyCode)}
                sx={{ minWidth: 120 }}
              >
                {CURRENCY_OPTION_ITEMS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </div>

            <Button variant="outlined" size="small" onClick={handleReset} className="h-10">
              リセット
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {scopeNoteItems.map((note) => (
              <span key={note} className="rounded-full bg-gray-100 px-2 py-1">
                {note}
              </span>
            ))}
          </div>
        </div>
      </Paper>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm"
          >
            <div className="text-sm font-semibold text-gray-500">{item.label}</div>
            <div className="text-2xl font-bold text-gray-900">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-700">{partnerLabel}割合</div>
          <div className="text-xs text-gray-500">合計金額ベース（{displayCurrency}）</div>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div className="h-55 w-55">
              <PieChart data={pieSlices} />
            </div>
            <div className="flex min-w-50 flex-col gap-2 text-sm text-gray-700">
              {pieSlices.length ? (
                pieSlices.map((slice) => (
                  <div key={slice.label} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
                      <span className="max-w-40 truncate">{slice.label}</span>
                    </div>
                    <span className="text-xs text-gray-500">{slice.percent.toFixed(1)}%</span>
                  </div>
                ))
              ) : (
                <span className="text-sm text-gray-400">データなし</span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-700">金額推移（{groupUnitLabel}）</div>
              <div className="text-xs text-gray-500">棒: 合計金額 / 線: 金額推移</div>
            </div>
            <div className="text-xs text-gray-500">{displayCurrency}</div>
          </div>
          <div className="mt-2 h-60">
            <BarLineChart data={trendData} unitLabel={displayCurrency} />
          </div>
        </div>
      </div>

      {filteredRows.length ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold text-gray-700">期間別サマリー</div>
            <DataTable columns={periodColumns} rows={periodRows} getRowId={(row) => row.id} />
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold text-gray-700">{partnerLabel}別サマリー</div>
            <DataTable columns={partnerColumns} rows={partnerRows} getRowId={(row) => row.id} />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
          条件に一致するデータがありません。
        </div>
      )}
    </div>
  );
}
