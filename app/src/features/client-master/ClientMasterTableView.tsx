"use client";

import React, { useMemo, useState } from "react";
import { Chip, IconButton } from "@mui/material";
import { Trash2 } from "lucide-react";
import DataTable, { TableColumn } from "@/components/DataTable";
import { ClientRow, clientRows } from "@/mock/clientMasterData";

const statusStyles = {
  active: { label: "有効", backgroundColor: "#e9f7ef", color: "#15803d" },
  inactive: { label: "無効", backgroundColor: "#f3f4f6", color: "#374151" },
};

const columns: TableColumn<ClientRow>[] = [
  {
    key: "name",
    header: "仕入先",
    sortKey: "name",
    render: (row) => (
      <div>
        <div className="text-sm font-semibold text-gray-900">{row.name}</div>
        <div className="text-xs text-gray-500">{row.description}</div>
      </div>
    ),
  },
  {
    key: "category",
    header: "区分",
    sortKey: "category",
    render: (row) => (
      <Chip
        label={row.category}
        size="small"
        sx={{
          backgroundColor: "#e8f1ff",
          color: "#2563eb",
          fontWeight: 600,
        }}
      />
    ),
  },
  {
    key: "region",
    header: "地域",
    sortKey: "region",
    render: (row) => <span className="text-sm">{row.region}</span>,
  },
  {
    key: "currency",
    header: "通貨",
    sortKey: "currency",
    render: (row) => <span className="text-sm font-semibold">{row.currency}</span>,
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
    render: () => (
      <IconButton size="small" aria-label="delete">
        <Trash2 size={16} className="text-red-500" />
      </IconButton>
    ),
  },
];

export default function ClientMasterTableView() {
  const [sortKey, setSortKey] = useState<keyof ClientRow>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    const typedKey = key as keyof ClientRow;
    if (sortKey === typedKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(typedKey);
    setSortDirection("asc");
  };

  const rows = useMemo(() => {
    const sorted = [...clientRows];
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
  }, [sortDirection, sortKey]);

  return (
    <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
  );
}
