"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { ChevronDown, ChevronRight } from "lucide-react";
import Modal from "@/components/Modal";
import { formatCurrencyValue } from "@/features/aggregation/aggregationUtils";
import { getSalesOrderMetrics } from "@/features/sales-management/salesManagementUtils";
import type { SalesRow } from "@/features/sales-management/types";
import { useLanguage } from "@/lib/i18n/language";

type OrderSummaryRow = {
  salesOrderId: string;
  orderNo: string;
  currency: string;
  shippedAmount: number;
  paidAmount: number;
  receivableBalance: number;
};

type SummaryRow = {
  groupKey: string;
  customerName: string;
  currency: string;
  shippedAmount: number;
  paidAmount: number;
  receivableBalance: number;
  orders: OrderSummaryRow[];
};

type RemainingReceivableSummaryModalProps = {
  open: boolean;
  rows: SalesRow[];
  onClose: () => void;
};

const headerCellSx = {
  fontSize: 12,
  fontWeight: 600,
  color: "#6b7280",
  borderBottom: "1px solid #e5e7eb",
  py: 1.5,
  backgroundColor: "#f8fafc",
};

const bodyCellSx = {
  fontSize: 13,
  color: "#111827",
  borderBottom: "1px solid #e5e7eb",
  py: 1.75,
};

export default function RemainingReceivableSummaryModal({
  open,
  rows,
  onClose,
}: RemainingReceivableSummaryModalProps) {
  const { tx } = useLanguage();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());

  const summaryRows = useMemo<SummaryRow[]>(() => {
    const summaryMap = new Map<string, SummaryRow>();

    rows.forEach((row) => {
      const metrics = getSalesOrderMetrics(row);
      if (metrics.receivableBalance <= 0) {
        return;
      }

      const groupKey = `${row.customerName}__${row.currency}`;
      const orderSummary: OrderSummaryRow = {
        salesOrderId: row.salesOrderId,
        orderNo: row.orderNo,
        currency: row.currency,
        shippedAmount: metrics.shippedAmount,
        paidAmount: metrics.paidAmount,
        receivableBalance: metrics.receivableBalance,
      };

      const existing = summaryMap.get(groupKey);
      if (existing) {
        existing.shippedAmount += orderSummary.shippedAmount;
        existing.paidAmount += orderSummary.paidAmount;
        existing.receivableBalance += orderSummary.receivableBalance;
        existing.orders.push(orderSummary);
        return;
      }

      summaryMap.set(groupKey, {
        groupKey,
        customerName: row.customerName,
        currency: row.currency,
        shippedAmount: orderSummary.shippedAmount,
        paidAmount: orderSummary.paidAmount,
        receivableBalance: orderSummary.receivableBalance,
        orders: [orderSummary],
      });
    });

    return Array.from(summaryMap.values())
      .map((row) => ({
        ...row,
        orders: [...row.orders].sort((left, right) => left.orderNo.localeCompare(right.orderNo, "ja")),
      }))
      .sort(
        (left, right) =>
          left.customerName.localeCompare(right.customerName, "ja") || left.currency.localeCompare(right.currency, "ja"),
      );
  }, [rows]);

  const handleToggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  return (
    <Modal
      open={open}
      title="顧客別残入金額サマリー"
      onClose={onClose}
      actions={
        <div className="flex w-full items-center justify-end">
          <Button variant="outlined" onClick={onClose}>
            {tx("閉じる")}
          </Button>
        </div>
      }
      maxWidth="md"
      paperSx={{ height: "80vh", maxHeight: "80vh" }}
      contentSx={{ overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <div className="min-h-0 flex-1">
        <TableContainer
          component={Paper}
          elevation={0}
          className="overflow-hidden rounded-lg border border-gray-200"
          sx={{ maxHeight: "100%", overflowY: "auto" }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>顧客名</TableCell>
                <TableCell sx={headerCellSx}>通貨</TableCell>
                <TableCell sx={headerCellSx}>PO No.</TableCell>
                <TableCell align="right" sx={headerCellSx}>
                  出荷済金額
                </TableCell>
                <TableCell align="right" sx={headerCellSx}>
                  入金済金額
                </TableCell>
                <TableCell align="right" sx={headerCellSx}>
                  残入金額
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summaryRows.length ? (
                summaryRows.map((row) => {
                  const isExpanded = expandedGroups.has(row.groupKey);
                  return (
                    <Fragment key={row.groupKey}>
                      <TableRow>
                        <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }}>
                          <button
                            type="button"
                            onClick={() => handleToggleGroup(row.groupKey)}
                            className="flex items-center gap-1 rounded px-1 py-1 text-left hover:bg-gray-100"
                            aria-expanded={isExpanded}
                            aria-label={`${row.customerName} ${row.currency} ${isExpanded ? "collapse" : "expand"}`}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>{row.customerName}</span>
                          </button>
                        </TableCell>
                        <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }}>{row.currency || "-"}</TableCell>
                        <TableCell sx={{ ...bodyCellSx, color: "#6b7280" }}>-</TableCell>
                        <TableCell align="right" sx={bodyCellSx}>
                          {formatCurrencyValue(row.currency, row.shippedAmount)}
                        </TableCell>
                        <TableCell align="right" sx={bodyCellSx}>
                          {formatCurrencyValue(row.currency, row.paidAmount)}
                        </TableCell>
                        <TableCell align="right" sx={{ ...bodyCellSx, fontWeight: 600, color: "#16a34a" }}>
                          {formatCurrencyValue(row.currency, row.receivableBalance)}
                        </TableCell>
                      </TableRow>
                      {isExpanded
                        ? row.orders.map((order) => (
                            <TableRow key={`${row.groupKey}-${order.salesOrderId}`} sx={{ backgroundColor: "#f8fafc" }}>
                              <TableCell sx={bodyCellSx} />
                              <TableCell sx={bodyCellSx}>{order.currency || "-"}</TableCell>
                              <TableCell sx={{ ...bodyCellSx, fontWeight: 600, color: "#1d4ed8" }}>
                                {order.orderNo || "-"}
                              </TableCell>
                              <TableCell align="right" sx={bodyCellSx}>
                                {formatCurrencyValue(order.currency, order.shippedAmount)}
                              </TableCell>
                              <TableCell align="right" sx={bodyCellSx}>
                                {formatCurrencyValue(order.currency, order.paidAmount)}
                              </TableCell>
                              <TableCell align="right" sx={{ ...bodyCellSx, fontWeight: 600, color: "#16a34a" }}>
                                {formatCurrencyValue(order.currency, order.receivableBalance)}
                              </TableCell>
                            </TableRow>
                          ))
                        : null}
                    </Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} sx={{ ...bodyCellSx, textAlign: "center", color: "#6b7280", py: 3 }}>
                    {tx("該当する残入金額はありません")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </Modal>
  );
}
