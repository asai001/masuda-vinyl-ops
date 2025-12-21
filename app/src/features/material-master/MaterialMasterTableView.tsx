"use client";

import { useMemo, useState } from "react";
import { Chip, IconButton } from "@mui/material";
import { Trash2 } from "lucide-react";
import DataTable, { TableColumn } from "@/components/DataTable";
import { MaterialRow } from "@/mock/materialMasterData";

const statusStyles = {
  active: { label: "有効", backgroundColor: "#e9f7ef", color: "#15803d" },
  inactive: { label: "無効", backgroundColor: "#f3f4f6", color: "#374151" },
};

type MaterialMasterTableViewProps = {
  rows: MaterialRow[];
  onRowClick?: (row: MaterialRow) => void;
  onDelete?: (row: MaterialRow) => void;
};

export default function MaterialMasterTableView({ rows, onRowClick, onDelete }: MaterialMasterTableViewProps) {
  const [sortKey, setSortKey] = useState<keyof MaterialRow>("code");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const columns = useMemo<TableColumn<MaterialRow>[]>(() => [
    {
      key: "code",
      header: "品番",
      sortKey: "code",
      render: (row) => <span className="text-sm font-semibold">{row.code}</span>,
    },
    {
      key: "name",
      header: "品目名",
      sortKey: "name",
      render: (row) => <span className="text-sm font-semibold text-gray-900">{row.name}</span>,
    },
    {
      key: "supplier",
      header: "仕入先",
      sortKey: "supplier",
      render: (row) => <span className="text-sm">{row.supplier}</span>,
    },
    {
      key: "category",
      header: "カテゴリ",
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
      key: "unit",
      header: "単位",
      sortKey: "unit",
      render: (row) => <span className="text-sm">{row.unit}</span>,
    },
    {
      key: "unitPrice",
      header: "標準単価",
      sortKey: "unitPrice",
      render: (row) => (
        <span className="text-sm font-semibold">
          {row.currency} {row.unitPrice.toFixed(1)}
        </span>
      ),
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
  ], [onDelete]);

  const handleSort = (key: string) => {
    const typedKey = key as keyof MaterialRow;
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
