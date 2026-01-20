"use client";

import { useMemo, useState } from "react";
import { Button, Chip, CircularProgress, IconButton } from "@mui/material";
import { Trash2 } from "lucide-react";
import DataTable, { TableColumn } from "@/components/DataTable";
import { calculateSalesMetrics } from "@/features/sales-management/salesManagementUtils";
import { salesDocumentStatusOptions, salesStatusOptions } from "@/features/sales-management/types";
import type { SalesLineItem, SalesRow } from "@/features/sales-management/types";

const amountFormatter = new Intl.NumberFormat("en-US");
const timeFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const currencySymbols: Record<string, string> = {
  JPY: "¥",
  USD: "$",
  VND: "₫",
};

const formatCurrency = (currency: string, value: number) => {
  const symbol = currencySymbols[currency];
  if (symbol) {
    return `${symbol}${amountFormatter.format(value)}`;
  }
  return `${currency} ${amountFormatter.format(value)}`;
};

const getItemSummary = (items: SalesLineItem[]) => {
  if (!items.length) {
    return { code: "-", name: "", extraCount: 0 };
  }
  const [first, ...rest] = items;
  return { code: first.productCode, name: first.productName, extraCount: rest.length };
};

const getMaterials = (items: SalesLineItem[]) => {
  const uniqueMaterials = new Set<string>();
  items.forEach((item) => item.materials.forEach((material) => uniqueMaterials.add(material)));
  return Array.from(uniqueMaterials);
};

const getStockLabel = (items: SalesLineItem[]) => {
  if (!items.length) {
    return "-";
  }
  const values = items.map((item) => item.stockQuantity);
  const uniqueValues = new Set(values);
  if (uniqueValues.size === 1) {
    const value = values[0];
    return value === null ? "-" : amountFormatter.format(value);
  }
  return "複数";
};

const getUnitPriceLabel = (items: SalesLineItem[], currency: string) => {
  if (!items.length) {
    return "-";
  }
  const values = items.map((item) => item.unitPrice);
  const uniqueValues = new Set(values);
  if (uniqueValues.size === 1) {
    return formatCurrency(currency, values[0]);
  }
  return "複数";
};

const renderStatusItems = (items: { label: string; active: boolean }[]) => (
  <div className="flex flex-col gap-1 text-xs text-gray-700">
    {items.map((item) => (
      <div key={item.label} className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${item.active ? "bg-green-500" : "bg-gray-300"}`} />
        <span>{item.label}</span>
      </div>
    ))}
  </div>
);

type SortKey =
  | "orderNo"
  | "orderDate"
  | "customerName"
  | "productCode"
  | "orderQuantity"
  | "shippedQuantity"
  | "remainingQuantity"
  | "unitPrice"
  | "amount"
  | "deliveryDate";

type SalesManagementTableViewProps = {
  rows: SalesRow[];
  onRowClick?: (row: SalesRow) => void;
  onDelete?: (row: SalesRow) => void;
  onIssue?: (row: SalesRow) => void;
  issuingRowId?: number | null;
};

export default function SalesManagementTableView({
  rows,
  onRowClick,
  onDelete,
  onIssue,
  issuingRowId,
}: SalesManagementTableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("orderDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const columns = useMemo<TableColumn<SalesRow>[]>(() => [
    {
      key: "orderNo",
      header: "PO NO.",
      sortKey: "orderNo",
      render: (row) => <span className="text-sm font-semibold text-blue-600">{row.orderNo}</span>,
    },
    {
      key: "orderDate",
      header: "受注日",
      sortKey: "orderDate",
      render: (row) => <span className="text-sm">{row.orderDate}</span>,
    },
    {
      key: "customerName",
      header: "顧客名",
      sortKey: "customerName",
      render: (row) => (
        <div className="flex flex-col text-sm">
          <span className="font-semibold">{row.customerName}</span>
          <span className="text-gray-500">{row.customerRegion}</span>
        </div>
      ),
    },
    {
      key: "product",
      header: "品目/品番",
      sortKey: "productCode",
      render: (row) => {
        const summary = getItemSummary(row.items);
        return (
          <div className="flex flex-col text-sm">
            <span className="font-semibold">{summary.code}</span>
            <span className="text-gray-600">{summary.name}</span>
            {summary.extraCount ? <span className="text-xs text-gray-500">他{summary.extraCount}件</span> : null}
          </div>
        );
      },
    },
    {
      key: "materials",
      header: "使用材料",
      render: (row) => {
        const materials = getMaterials(row.items);
        return materials.length ? (
          <div className="flex flex-wrap gap-1">
            {materials.map((material) => (
              <Chip
                key={material}
                label={material}
                size="small"
                sx={{
                  backgroundColor: "#e8f1ff",
                  color: "#2563eb",
                  fontWeight: 600,
                }}
              />
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        );
      },
    },
    {
      key: "stockQuantity",
      header: "在庫数",
      align: "right",
      render: (row) => <span className="text-sm">{getStockLabel(row.items)}</span>,
    },
    {
      key: "orderQuantity",
      header: "注数",
      sortKey: "orderQuantity",
      align: "right",
      render: (row) => {
        const metrics = calculateSalesMetrics(row.items);
        return <span className="text-sm">{amountFormatter.format(metrics.orderQuantity)}</span>;
      },
    },
    {
      key: "shippedQuantity",
      header: "出荷数",
      sortKey: "shippedQuantity",
      align: "right",
      render: (row) => {
        const metrics = calculateSalesMetrics(row.items);
        return <span className="text-sm">{amountFormatter.format(metrics.shippedQuantity)}</span>;
      },
    },
    {
      key: "remainingQuantity",
      header: "残注数",
      sortKey: "remainingQuantity",
      align: "right",
      render: (row) => {
        const metrics = calculateSalesMetrics(row.items);
        return <span className="text-sm font-semibold">{amountFormatter.format(metrics.remainingQuantity)}</span>;
      },
    },
    {
      key: "unitPrice",
      header: "単価",
      sortKey: "unitPrice",
      align: "right",
      render: (row) => <span className="text-sm font-semibold">{getUnitPriceLabel(row.items, row.currency)}</span>,
    },
    {
      key: "amount",
      header: "金額",
      sortKey: "amount",
      align: "right",
      render: (row) => {
        const metrics = calculateSalesMetrics(row.items);
        return <span className="text-sm font-semibold">{formatCurrency(row.currency, metrics.amount)}</span>;
      },
    },
    {
      key: "requiredMaterial",
      header: "必要材料量",
      align: "right",
      render: (row) => {
        const metrics = calculateSalesMetrics(row.items);
        if (metrics.requiredMaterial === null) {
          return <span className="text-sm text-gray-400">-</span>;
        }
        return <span className="text-sm">{amountFormatter.format(metrics.requiredMaterial)} kg</span>;
      },
    },
    {
      key: "moldingTime",
      header: "成形時間",
      align: "right",
      render: (row) => {
        const metrics = calculateSalesMetrics(row.items);
        if (metrics.moldingTime === null) {
          return <span className="text-sm text-gray-400">-</span>;
        }
        return <span className="text-sm">{timeFormatter.format(metrics.moldingTime)} 時間</span>;
      },
    },
    {
      key: "deliveryDate",
      header: "納品予定日",
      sortKey: "deliveryDate",
      render: (row) => <span className="text-sm">{row.deliveryDate}</span>,
    },
    {
      key: "status",
      header: "ステータス",
      render: (row) =>
        renderStatusItems(
          salesStatusOptions.map((status) => ({
            label: status.label,
            active: row.status[status.key],
          }))
        ),
    },
    {
      key: "documentStatus",
      header: "請求状況",
      render: (row) =>
        renderStatusItems(
          salesDocumentStatusOptions.map((status) => ({
            label: status.label,
            active: row.documentStatus[status.key],
          }))
        ),
    },
    {
      key: "download",
      header: (
        <div className="flex flex-col leading-tight">
          <span>インボイス</span>
          <span>パッキングリスト</span>
        </div>
      ),
      align: "center",
      render: (row) => {
        const isIssuing = issuingRowId === row.id;
        return (
          <Button
            size="small"
            variant="outlined"
            disabled={isIssuing}
            startIcon={isIssuing ? <CircularProgress size={16} /> : null}
            onClick={(event) => {
              event.stopPropagation();
              onIssue?.(row);
            }}
          >
            {isIssuing ? "発行中..." : "発行"}
          </Button>
        );
      },
    },
    {
      key: "delete",
      header: <span>削除</span>,
      align: "center",
      render: (row) =>
        onDelete ? (
          <IconButton
            size="small"
            aria-label="delete"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(row);
            }}
          >
            <Trash2 size={16} className="text-red-500" />
          </IconButton>
        ) : (
          <Trash2 size={16} className="text-red-500" />
        ),
    },
  ], [issuingRowId, onDelete, onIssue]);

  const handleSort = (key: string) => {
    const typedKey = key as SortKey;
    if (sortKey === typedKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(typedKey);
    setSortDirection("asc");
  };

  const getSortValue = (row: SalesRow, key: SortKey) => {
    switch (key) {
      case "productCode":
        return row.items[0]?.productCode ?? "";
      case "orderQuantity":
        return calculateSalesMetrics(row.items).orderQuantity;
      case "shippedQuantity":
        return calculateSalesMetrics(row.items).shippedQuantity;
      case "remainingQuantity":
        return calculateSalesMetrics(row.items).remainingQuantity;
      case "unitPrice":
        return row.items[0]?.unitPrice ?? 0;
      case "amount":
        return calculateSalesMetrics(row.items).amount;
      default:
        return row[key as keyof SalesRow];
    }
  };

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const aValue = getSortValue(a, sortKey);
      const bValue = getSortValue(b, sortKey);
      if (sortKey === "orderDate" || sortKey === "deliveryDate") {
        const aDate = Date.parse(String(aValue));
        const bDate = Date.parse(String(bValue));
        if (Number.isNaN(aDate) || Number.isNaN(bDate)) {
          return 0;
        }
        return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      const aText = String(aValue);
      const bText = String(bValue);
      return sortDirection === "asc" ? aText.localeCompare(bText) : bText.localeCompare(aText);
    });
    return sorted;
  }, [rows, sortDirection, sortKey]);

  return (
    <DataTable
      columns={columns}
      rows={sortedRows}
      getRowId={(row) => row.id}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSort={handleSort}
      onRowClick={onRowClick}
      enableHorizontalScroll
    />
  );
}
