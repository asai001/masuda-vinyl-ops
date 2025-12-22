"use client";

import { useMemo, useState } from "react";
import { IconButton } from "@mui/material";
import { Trash2 } from "lucide-react";
import DataTable, { TableColumn } from "@/components/DataTable";
import { documentStatusOptions, orderStatusOptions, OrderRow } from "@/mock/orderManagementData";

const unitPriceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const amountFormatter = new Intl.NumberFormat("en-US");

const formatCurrencyValue = (currency: string, value: number, formatter: Intl.NumberFormat) =>
  `${currency} ${formatter.format(value)}`;

type OrderManagementTableViewProps = {
  rows: OrderRow[];
  onDelete?: (row: OrderRow) => void;
  onRowClick?: (row: OrderRow) => void;
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

export default function OrderManagementTableView({ rows, onDelete, onRowClick }: OrderManagementTableViewProps) {
  const [sortKey, setSortKey] = useState<keyof OrderRow>("orderDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const columns = useMemo<TableColumn<OrderRow>[]>(() => [
    {
      key: "orderDate",
      header: "発注日",
      sortKey: "orderDate",
      render: (row) => <span className="text-sm">{row.orderDate}</span>,
    },
    {
      key: "supplier",
      header: "仕入先",
      sortKey: "supplier",
      render: (row) => <span className="text-sm font-semibold">{row.supplier}</span>,
    },
    {
      key: "item",
      header: "品目/品番",
      sortKey: "itemName",
      render: (row) => (
        <div className="flex flex-col text-sm">
          <span className="font-semibold">{row.itemCode}</span>
          <span className="text-gray-600">{row.itemName}</span>
        </div>
      ),
    },
    {
      key: "quantity",
      header: "数量",
      sortKey: "quantity",
      align: "right",
      render: (row) => <span className="text-sm">{amountFormatter.format(row.quantity)}</span>,
    },
    {
      key: "unitPrice",
      header: "単価",
      sortKey: "unitPrice",
      align: "right",
      render: (row) => (
        <span className="text-sm font-semibold">
          {formatCurrencyValue(row.currency, row.unitPrice, unitPriceFormatter)}
        </span>
      ),
    },
    {
      key: "amount",
      header: "金額",
      sortKey: "amount",
      align: "right",
      render: (row) => (
        <span className="text-sm font-semibold">{formatCurrencyValue(row.currency, row.amount, amountFormatter)}</span>
      ),
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
          orderStatusOptions.map((status) => ({
            label: status.label,
            active: row.status[status.key],
          }))
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
          }))
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
  ], [onDelete]);

  const handleSort = (key: string) => {
    const typedKey = key as keyof OrderRow;
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
    />
  );
}
