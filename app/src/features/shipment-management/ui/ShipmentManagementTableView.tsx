"use client";

import { useMemo, useState } from "react";
import { Button, CircularProgress, IconButton } from "@mui/material";
import { Trash2 } from "lucide-react";
import DataTable, { TableColumn } from "@/components/DataTable";
import type { SalesRow } from "@/features/sales-management/types";
import {
  getShipmentOrderNos,
  getShipmentTotalAmount,
  getShipmentTotalQuantity,
  resolveShipmentAllocations,
} from "@/features/shipment-management/shipmentUtils";
import type { ShipmentRow } from "@/features/shipment-management/types";

const amountFormatter = new Intl.NumberFormat("en-US");

const formatCurrencyValue = (currency: string, value: number) => {
  const normalizedCurrency = currency?.toUpperCase();
  if (!normalizedCurrency) {
    return amountFormatter.format(value);
  }
  return `${normalizedCurrency} ${amountFormatter.format(value)}`;
};

type SortKey = "shipmentNo" | "deliveryDate" | "customerName" | "orderNo" | "quantity" | "amount";

type ShipmentManagementTableViewProps = {
  rows: ShipmentRow[];
  salesRows: SalesRow[];
  onRowClick?: (row: ShipmentRow) => void;
  onDelete?: (row: ShipmentRow) => void;
  onIssue?: (row: ShipmentRow) => void;
  issuingShipmentId?: string | null;
};

export default function ShipmentManagementTableView({
  rows,
  salesRows,
  onRowClick,
  onDelete,
  onIssue,
  issuingShipmentId,
}: ShipmentManagementTableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("deliveryDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const summaryMap = useMemo(
    () =>
      new Map(
        rows.map((row) => [
          row.shipmentId,
          {
            orderNos: getShipmentOrderNos(row, salesRows),
            totalQuantity: getShipmentTotalQuantity(row),
            totalAmount: getShipmentTotalAmount(row, salesRows),
            lineCount: resolveShipmentAllocations(row, salesRows).length,
          },
        ]),
      ),
    [rows, salesRows],
  );

  const columns = useMemo<TableColumn<ShipmentRow>[]>(
    () => [
      {
        key: "shipmentNo",
        header: "出荷No.",
        sortKey: "shipmentNo",
        render: (row) => <span className="text-sm font-semibold text-blue-600">{row.shipmentNo}</span>,
      },
      {
        key: "deliveryDate",
        header: "出荷日",
        sortKey: "deliveryDate",
        render: (row) => <span className="text-sm">{row.deliveryDate}</span>,
      },
      {
        key: "customerName",
        header: "顧客名",
        sortKey: "customerName",
        render: (row) => (
          <div className="flex flex-col text-sm">
            <span className="font-semibold">{row.customerName || "-"}</span>
            <span className="text-gray-500">{row.customerRegion || "-"}</span>
          </div>
        ),
      },
      {
        key: "orderNos",
        header: "対象PO No.",
        sortKey: "orderNo",
        render: (row) => {
          const orderNos = summaryMap.get(row.shipmentId)?.orderNos ?? [];
          if (!orderNos.length) {
            return <span className="text-sm text-gray-400">-</span>;
          }
          const [first, second, ...rest] = orderNos;
          return (
            <div className="flex flex-col text-sm">
              <span>{first}</span>
              {second ? <span>{second}</span> : null}
              {rest.length ? <span className="text-xs text-gray-500">他{rest.length}件</span> : null}
            </div>
          );
        },
      },
      {
        key: "quantity",
        header: "出荷数",
        sortKey: "quantity",
        align: "right",
        render: (row) => (
          <span className="text-sm font-semibold">
            {amountFormatter.format(summaryMap.get(row.shipmentId)?.totalQuantity ?? 0)}
          </span>
        ),
      },
      {
        key: "lineCount",
        header: "明細数",
        align: "right",
        render: (row) => <span className="text-sm">{amountFormatter.format(summaryMap.get(row.shipmentId)?.lineCount ?? 0)}</span>,
      },
      {
        key: "amount",
        header: "出荷金額",
        sortKey: "amount",
        align: "right",
        render: (row) => (
          <span className="text-sm font-semibold">
            {formatCurrencyValue(row.currency, summaryMap.get(row.shipmentId)?.totalAmount ?? 0)}
          </span>
        ),
      },
      {
        key: "paidAmount",
        header: "入金額",
        align: "right",
        render: (row) => <span className="text-sm">{formatCurrencyValue(row.currency, row.paidAmount)}</span>,
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
          const isIssuing = issuingShipmentId === row.shipmentId;
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
    ],
    [issuingShipmentId, onDelete, onIssue, salesRows, summaryMap],
  );

  const handleSort = (key: string) => {
    const nextKey = key as SortKey;
    if (sortKey === nextKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  };

  const getSortValue = (row: ShipmentRow, key: SortKey) => {
    switch (key) {
      case "orderNo":
        return (summaryMap.get(row.shipmentId)?.orderNos ?? [])[0] ?? "";
      case "quantity":
        return summaryMap.get(row.shipmentId)?.totalQuantity ?? 0;
      case "amount":
        return summaryMap.get(row.shipmentId)?.totalAmount ?? 0;
      default:
        return row[key];
    }
  };

  const sortedRows = useMemo(() => {
    const nextRows = [...rows];
    nextRows.sort((left, right) => {
      const leftValue = getSortValue(left, sortKey);
      const rightValue = getSortValue(right, sortKey);
      if (sortKey === "deliveryDate") {
        const leftDate = Date.parse(String(leftValue));
        const rightDate = Date.parse(String(rightValue));
        return sortDirection === "asc" ? leftDate - rightDate : rightDate - leftDate;
      }
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return sortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue;
      }
      return sortDirection === "asc"
        ? String(leftValue).localeCompare(String(rightValue))
        : String(rightValue).localeCompare(String(leftValue));
    });
    return nextRows;
  }, [rows, sortDirection, sortKey, summaryMap]);

  return (
    <DataTable
      columns={columns}
      rows={sortedRows}
      getRowId={(row) => row.shipmentId}
      sortKey={sortKey}
      sortDirection={sortDirection}
      onSort={handleSort}
      onRowClick={onRowClick}
      enableHorizontalScroll
    />
  );
}
