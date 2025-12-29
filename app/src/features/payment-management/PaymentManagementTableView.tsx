"use client";

import { useMemo, useState } from "react";
import { Chip, IconButton } from "@mui/material";
import { Trash2 } from "lucide-react";
import DataTable, { TableColumn } from "@/components/DataTable";
import { PaymentManagementRow } from "@/mock/paymentManagementData";

const categoryStyles: Record<string, { backgroundColor: string; color: string }> = {
  家賃: { backgroundColor: "#e8f1ff", color: "#2563eb" },
  光熱費: { backgroundColor: "#fff7ed", color: "#ea580c" },
  通信費: { backgroundColor: "#ecfdf3", color: "#16a34a" },
  保険: { backgroundColor: "#fef2f2", color: "#dc2626" },
};

const statusStyles = {
  paid: { label: "支払済み", backgroundColor: "#ecfdf3", color: "#16a34a" },
  unpaid: { label: "未払い", backgroundColor: "#fff7ed", color: "#ea580c" },
};

const formatAmount = (amount: number, currency: string) => {
  if (!currency) {
    return amount.toLocaleString("ja-JP");
  }
  try {
    return new Intl.NumberFormat("ja-JP", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("ja-JP")}`;
  }
};

type PaymentManagementTableViewProps = {
  rows: PaymentManagementRow[];
  onRowClick?: (row: PaymentManagementRow) => void;
  onDelete?: (row: PaymentManagementRow) => void;
};

export default function PaymentManagementTableView({ rows, onRowClick, onDelete }: PaymentManagementTableViewProps) {
  const [sortKey, setSortKey] = useState<keyof PaymentManagementRow>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const columns = useMemo<TableColumn<PaymentManagementRow>[]>(
    () => [
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
        key: "amount",
        header: "金額",
        sortKey: "amount",
        render: (row) => <span className="text-sm font-semibold">{formatAmount(row.amount, row.currency)}</span>,
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
        render: (row) => <span className="text-sm">{row.paymentDate}</span>,
      },
      {
        key: "status",
        header: "ステータス",
        sortKey: "status",
        render: (row) => {
          const statusStyle = statusStyles[row.status];
          return (
            <Chip
              label={statusStyle.label}
              size="small"
              sx={{
                backgroundColor: statusStyle.backgroundColor,
                color: statusStyle.color,
                fontWeight: 600,
              }}
            />
          );
        },
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
    [onDelete]
  );

  const handleSort = (key: string) => {
    const typedKey = key as keyof PaymentManagementRow;
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
    />
  );
}
