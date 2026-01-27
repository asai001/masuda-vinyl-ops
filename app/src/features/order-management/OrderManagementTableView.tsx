"use client";

import { useMemo, useState } from "react";
import { Button, IconButton } from "@mui/material";
import { Trash2 } from "lucide-react";
import DataTable, { TableColumn } from "@/components/DataTable";
import { documentStatusOptions, orderStatusOptions, type OrderRow } from "@/features/order-management/types";

const unitPriceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const amountFormatter = new Intl.NumberFormat("en-US");

const formatCurrencyValue = (currency: string, value: number, formatter: Intl.NumberFormat) =>
  `${currency} ${formatter.format(value)}`;

const getItemSummary = (items: OrderRow["items"]) => {
  if (!items.length) {
    return { code: "-", name: "", extraCount: 0 };
  }
  const [first, ...rest] = items;
  return { code: first.itemCode, name: first.itemName, extraCount: rest.length };
};

const getQuantityLabel = (items: OrderRow["items"]) => {
  if (!items.length) {
    return "-";
  }
  const units = new Set(items.map((item) => item.unit));
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  if (units.size === 1) {
    const unit = items[0]?.unit ?? "";
    return `${amountFormatter.format(total)} ${unit}`.trim();
  }
  return "複数";
};

const getUnitPriceLabel = (items: OrderRow["items"], currency: string) => {
  if (!items.length) {
    return "-";
  }
  if (items.length === 1) {
    return formatCurrencyValue(currency, items[0].unitPrice, unitPriceFormatter);
  }
  return "複数";
};

type SortKey = "orderDate" | "supplier" | "itemName" | "quantity" | "unitPrice" | "amount" | "deliveryDate";

type OrderManagementTableViewProps = {
  rows: OrderRow[];
  onDelete?: (row: OrderRow) => void;
  onRowClick?: (row: OrderRow) => void;
  onIssue?: (row: OrderRow) => void;
};

const renderStatusItems = (items: { label: string; active: boolean }[]) => (
  <div className="flex flex-col gap-1 text-xs text-gray-700">
    {items.map((item) => (
      <div key={item.label} className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${item.active ? "bg-green-500" : "bg-gray-300"}`} />
        <span className="whitespace-nowrap">{item.label}</span>
      </div>
    ))}
  </div>
);

export default function OrderManagementTableView({
  rows,
  onDelete,
  onRowClick,
  onIssue,
}: OrderManagementTableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("orderDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const columns = useMemo<TableColumn<OrderRow>[]>(
    () => [
      {
        key: "orderDate",
        header: "発注日",
        sortKey: "orderDate",
        render: (row) => <span className="text-sm whitespace-nowrap">{row.orderDate}</span>,
      },
      {
        key: "supplier",
        header: "仕入先",
        sortKey: "supplier",
        render: (row) => <span className="text-sm font-semibold whitespace-nowrap">{row.supplier}</span>,
      },
      {
        key: "item",
        header: "品目/品番",
        sortKey: "itemName",
        render: (row) => {
          const summary = getItemSummary(row.items);
          return (
            <div className="flex flex-col text-sm">
              <span className="font-semibold whitespace-nowrap">{summary.code}</span>
              <span className="text-gray-600 whitespace-nowrap">{summary.name}</span>
              {summary.extraCount ? <span className="text-xs text-gray-500">他{summary.extraCount}件</span> : null}
            </div>
          );
        },
      },
      {
        key: "quantity",
        header: "数量",
        sortKey: "quantity",
        align: "right",
        render: (row) => <span className="text-sm whitespace-nowrap">{getQuantityLabel(row.items)}</span>,
      },
      {
        key: "unitPrice",
        header: "単価",
        sortKey: "unitPrice",
        align: "right",
        render: (row) => (
          <span className="text-sm font-semibold whitespace-nowrap">{getUnitPriceLabel(row.items, row.currency)}</span>
        ),
      },
      {
        key: "amount",
        header: "金額",
        sortKey: "amount",
        align: "right",
        render: (row) => (
          <span className="text-sm font-semibold whitespace-nowrap">
            {formatCurrencyValue(row.currency, row.amount, amountFormatter)}
          </span>
        ),
      },
      {
        key: "deliveryDate",
        header: "納品予定日",
        sortKey: "deliveryDate",
        render: (row) => <span className="text-sm whitespace-nowrap">{row.deliveryDate}</span>,
      },
      {
        key: "status",
        header: "ステータス",
        render: (row) =>
          renderStatusItems(
            orderStatusOptions.map((status) => ({
              label: status.label,
              active: row.status[status.key],
            })),
          ),
      },
      {
        key: "documentStatus",
        header: "書類状況",
        render: (row) =>
          renderStatusItems(
            documentStatusOptions.map((status) => ({
              label: status.label,
              active: row.documentStatus[status.key],
            })),
          ),
      },
      {
        key: "issue",
        header: <span>注文書</span>,
        align: "center",
        render: (row) => (
          <Button
            size="small"
            variant="outlined"
            onClick={(event) => {
              event.stopPropagation();
              onIssue?.(row);
            }}
          >
            発行
          </Button>
        ),
      },
      {
        key: "delete",
        header: <span>削除</span>,
        align: "center",
        render: (row) => (
          <IconButton
            size="small"
            aria-label="delete"
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.(row);
            }}
          >
            <Trash2 size={16} className="text-red-500" />
          </IconButton>
        ),
      },
    ],
    [onDelete, onIssue],
  );

  const handleSort = (key: string) => {
    const typedKey = key as SortKey;
    if (sortKey === typedKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(typedKey);
    setSortDirection("asc");
  };

  const getSortValue = (row: OrderRow, key: SortKey) => {
    switch (key) {
      case "itemName":
        return row.items[0]?.itemName ?? "";
      case "quantity":
        return row.items.reduce((sum, item) => sum + item.quantity, 0);
      case "unitPrice":
        return row.items[0]?.unitPrice ?? 0;
      default:
        return row[key as keyof OrderRow];
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
      getRowId={(row) => row.purchaseOrderId}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSort={handleSort}
      onRowClick={onRowClick}
    />
  );
}
