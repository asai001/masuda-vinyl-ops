"use client";

import { useCallback, useMemo, useState } from "react";
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
import { useLanguage } from "@/lib/i18n/language";

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
  const { language } = useLanguage();
  const tr = useCallback((ja: string, vi: string) => (language === "vi" ? vi : ja), [language]);
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
        header: tr("出荷No.", "Số xuất hàng"),
        sortKey: "shipmentNo",
        render: (row) => <span className="text-sm font-semibold text-blue-600">{row.shipmentNo}</span>,
      },
      {
        key: "deliveryDate",
        header: tr("出荷日", "Ngày xuất hàng"),
        sortKey: "deliveryDate",
        render: (row) => <span className="text-sm">{row.deliveryDate}</span>,
      },
      {
        key: "customerName",
        header: tr("顧客名", "Tên khách hàng"),
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
        header: tr("対象PO No.", "PO No. mục tiêu"),
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
              {rest.length ? (
                <span className="text-xs text-gray-500">{tr(`他${rest.length}件`, `Khác ${rest.length} mục`)}</span>
              ) : null}
            </div>
          );
        },
      },
      {
        key: "quantity",
        header: tr("出荷数", "Số lượng xuất"),
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
        header: tr("明細数", "Số chi tiết"),
        align: "right",
        render: (row) => <span className="text-sm">{amountFormatter.format(summaryMap.get(row.shipmentId)?.lineCount ?? 0)}</span>,
      },
      {
        key: "amount",
        header: tr("出荷金額", "Số tiền xuất hàng"),
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
        header: tr("入金額", "Số tiền thu"),
        align: "right",
        render: (row) => <span className="text-sm">{formatCurrencyValue(row.currency, row.paidAmount)}</span>,
      },
      {
        key: "download",
        header: (
          <div className="flex flex-col leading-tight">
            <span>{tr("インボイス", "Hóa đơn")}</span>
            <span>{tr("パッキングリスト", "Phiếu đóng gói")}</span>
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
              {isIssuing ? tr("発行中...", "Đang phát hành...") : tr("発行", "Phát hành")}
            </Button>
          );
        },
      },
      {
        key: "delete",
        header: <span>{tr("削除", "Xóa")}</span>,
        align: "center",
        render: (row) =>
          onDelete ? (
            <IconButton
              size="small"
              aria-label={tr("削除", "Xóa")}
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
    [issuingShipmentId, onDelete, onIssue, summaryMap, tr],
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

  const getSortValue = useCallback(
    (row: ShipmentRow, key: SortKey) => {
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
    },
    [summaryMap],
  );

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
  }, [getSortValue, rows, sortDirection, sortKey]);

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
