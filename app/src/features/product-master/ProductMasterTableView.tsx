"use client";

import { useMemo, useState } from "react";
import { Chip, IconButton } from "@mui/material";
import { Trash2 } from "lucide-react";
import DataTable, { TableColumn } from "@/components/DataTable";
import type { ProductRow } from "./types";

const statusStyles = {
  active: { label: "有効", backgroundColor: "#e9f7ef", color: "#15803d" },
  inactive: { label: "無効", backgroundColor: "#f3f4f6", color: "#374151" },
};

type ProductMasterTableViewProps = {
  rows: ProductRow[];
  onRowClick?: (row: ProductRow) => void;
  onDelete?: (row: ProductRow) => void;
};

const formatNumber = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function ProductMasterTableView({ rows, onRowClick, onDelete }: ProductMasterTableViewProps) {
  const [sortKey, setSortKey] = useState<keyof ProductRow>("code");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const columns = useMemo<TableColumn<ProductRow>[]>(
    () => [
      {
        key: "code",
        header: "品番",
        sortKey: "code",
        render: (row) => <span className="text-sm font-semibold whitespace-nowrap">{row.code}</span>,
      },
      {
        key: "name",
        header: "品目名",
        sortKey: "name",
        render: (row) => <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{row.name}</span>,
      },
      {
        key: "category",
        header: "カテゴリ",
        sortKey: "category",
        render: (row) => <span className="text-sm whitespace-nowrap">{row.category}</span>,
      },
      {
        key: "unit",
        header: "単位",
        sortKey: "unit",
        render: (row) => <span className="text-sm whitespace-nowrap">{row.unit}</span>,
      },
      {
        key: "unitPrice",
        header: "標準単価",
        sortKey: "unitPrice",
        render: (row) => (
          <span className="text-sm font-semibold whitespace-nowrap">
            {row.currency} {formatNumber(row.unitPrice)}
          </span>
        ),
      },
      {
        key: "materials",
        header: "使用材料",
        render: (row) => {
          if (!row.materials.length) {
            return <span className="text-sm text-gray-400">-</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {row.materials.map((material) => (
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
          );
        },
      },
      {
        key: "weight",
        header: "重量",
        sortKey: "weight",
        render: (row) => (
          <span className="text-sm whitespace-nowrap">
            {row.weight === null ? "-" : `${formatNumber(row.weight)} g`}
          </span>
        ),
      },
      {
        key: "length",
        header: "長さ",
        sortKey: "length",
        render: (row) => (
          <span className="text-sm whitespace-nowrap">
            {row.length === null ? "-" : `${formatNumber(row.length)} mm`}
          </span>
        ),
      },
      {
        key: "speed",
        header: "分速",
        sortKey: "speed",
        render: (row) => (
          <span className="text-sm whitespace-nowrap">
            {row.speed === null ? "-" : `${formatNumber(row.speed)} m/min`}
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
    ],
    [onDelete],
  );

  const handleSort = (key: string) => {
    const typedKey = key as keyof ProductRow;
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
      getRowId={(row) => row.productId}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSort={handleSort}
      onRowClick={onRowClick}
    />
  );
}
