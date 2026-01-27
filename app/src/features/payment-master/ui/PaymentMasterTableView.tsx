"use client";

import { useMemo, useState } from "react";
import { Chip, IconButton } from "@mui/material";
import { Trash2 } from "lucide-react";
import DataTable, { TableColumn } from "@/components/DataTable";
import type { PaymentRow } from "@/features/payment-master/types";

const categoryStyles: Record<string, { backgroundColor: string; color: string }> = {
  家賃: { backgroundColor: "#e8f1ff", color: "#2563eb" },
  光熱費: { backgroundColor: "#fff7ed", color: "#ea580c" },
  通信費: { backgroundColor: "#ecfdf3", color: "#16a34a" },
  保険: { backgroundColor: "#fef2f2", color: "#dc2626" },
};

const formatFixedAmount = (amount: number, currency: string) => {
  if (!currency) {
    return amount.toLocaleString("ja-JP");
  }
  try {
    return new Intl.NumberFormat("ja-JP", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("ja-JP")}`;
  }
};

type PaymentMasterTableViewProps = {
  rows: PaymentRow[];
  onRowClick?: (row: PaymentRow) => void;
  onDelete?: (row: PaymentRow) => void;
};

export default function PaymentMasterTableView({ rows, onRowClick, onDelete }: PaymentMasterTableViewProps) {
  const [sortKey, setSortKey] = useState<keyof PaymentRow>("content");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const columns = useMemo<TableColumn<PaymentRow>[]>(
    () => [
      {
        key: "content",
        header: "内容",
        sortKey: "content",
        render: (row) => (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-900">{row.content}</span>
            {row.isFixedCost ? <span className="text-xs font-semibold text-blue-600">固定費</span> : null}
          </div>
        ),
      },
      {
        key: "category",
        header: "カテゴリ",
        sortKey: "category",
        render: (row) => {
          const style = categoryStyles[row.category] ?? { backgroundColor: "#f3f4f6", color: "#374151" };
          return (
            <Chip
              label={row.category}
              size="small"
              sx={{
                backgroundColor: style.backgroundColor,
                color: style.color,
                fontWeight: 600,
              }}
            />
          );
        },
      },
      {
        key: "fixedAmount",
        header: "固定金額",
        sortKey: "fixedAmount",
        render: (row) =>
          row.isFixedCost && row.fixedAmount !== null ? (
            <span className="text-sm font-semibold">{formatFixedAmount(row.fixedAmount, row.currency)}</span>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          ),
      },
      {
        key: "paymentMethod",
        header: "支払方法",
        sortKey: "paymentMethod",
        render: (row) => <span className="text-sm">{row.paymentMethod}</span>,
      },
      {
        key: "paymentDate",
        header: "支払日",
        sortKey: "paymentDate",
        render: (row) => <span className="text-sm">{row.paymentDate}日</span>,
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
    [onDelete],
  );

  const handleSort = (key: string) => {
    const typedKey = key as keyof PaymentRow;
    if (sortKey === typedKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(typedKey);
    setSortDirection("asc");
  };

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      if (aValue === null || bValue === null) {
        if (aValue === null && bValue === null) {
          return 0;
        }
        return aValue === null ? 1 : -1;
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
      getRowId={(row) => row.paymentDefId}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSort={handleSort}
      onRowClick={onRowClick}
    />
  );
}
