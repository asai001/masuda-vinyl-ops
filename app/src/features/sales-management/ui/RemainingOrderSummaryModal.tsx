"use client";

import { Fragment, useMemo, useState } from "react";
import { Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from "@mui/material";
import { ChevronDown, ChevronRight } from "lucide-react";
import Modal from "@/components/Modal";
import { getSalesOrderMetrics } from "@/features/sales-management/salesManagementUtils";
import type { SalesRow } from "@/features/sales-management/types";
import { useLanguage } from "@/lib/i18n/language";

type OrderSummaryRow = {
  salesOrderId: string;
  orderNo: string;
  orderQuantity: number;
  shippedQuantity: number;
  remainingQuantity: number;
};

type SummaryRow = {
  customerName: string;
  orderQuantity: number;
  shippedQuantity: number;
  remainingQuantity: number;
  orders: OrderSummaryRow[];
};

type RemainingOrderSummaryModalProps = {
  open: boolean;
  rows: SalesRow[];
  onClose: () => void;
};

const amountFormatter = new Intl.NumberFormat("en-US");

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultDateRange = () => {
  const endDate = new Date();
  const baseDate = new Date(endDate);
  const targetMonth = baseDate.getMonth() - 1;
  const lastDay = new Date(baseDate.getFullYear(), targetMonth + 1, 0).getDate();
  const day = Math.min(baseDate.getDate(), lastDay);
  const startDate = new Date(baseDate.getFullYear(), targetMonth, day);
  return {
    startDate: formatDateInput(startDate),
    endDate: formatDateInput(endDate),
  };
};

const isWithinRange = (target: string, startDate: string, endDate: string) => {
  const targetTime = Date.parse(target);
  if (Number.isNaN(targetTime)) {
    return false;
  }
  const startTime = startDate ? Date.parse(startDate) : Number.NEGATIVE_INFINITY;
  const endTime = endDate ? Date.parse(endDate) : Number.POSITIVE_INFINITY;
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return false;
  }
  return targetTime >= startTime && targetTime <= endTime;
};

const headerCellSx = {
  fontSize: 12,
  fontWeight: 600,
  color: "#6b7280",
  borderBottom: "1px solid #e5e7eb",
  py: 1.5,
};

const bodyCellSx = {
  fontSize: 13,
  color: "#111827",
  borderBottom: "1px solid #e5e7eb",
  py: 1.75,
};

export default function RemainingOrderSummaryModal({ open, rows, onClose }: RemainingOrderSummaryModalProps) {
  const { tx } = useLanguage();
  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(() => new Set());

  const summaryRows = useMemo<SummaryRow[]>(() => {
    const summaryMap = new Map<string, SummaryRow>();
    rows.forEach((row) => {
      if (!isWithinRange(row.orderDate, startDate, endDate)) {
        return;
      }
      const metrics = getSalesOrderMetrics(row);
      if (metrics.remainingQuantity === 0) {
        return;
      }
      const existing = summaryMap.get(row.customerName);
      if (existing) {
        existing.orderQuantity += metrics.orderQuantity;
        existing.shippedQuantity += metrics.shippedQuantity;
        existing.remainingQuantity += metrics.remainingQuantity;
        existing.orders.push({
          salesOrderId: row.salesOrderId,
          orderNo: row.orderNo,
          orderQuantity: metrics.orderQuantity,
          shippedQuantity: metrics.shippedQuantity,
          remainingQuantity: metrics.remainingQuantity,
        });
      } else {
        summaryMap.set(row.customerName, {
          customerName: row.customerName,
          orderQuantity: metrics.orderQuantity,
          shippedQuantity: metrics.shippedQuantity,
          remainingQuantity: metrics.remainingQuantity,
          orders: [
            {
              salesOrderId: row.salesOrderId,
              orderNo: row.orderNo,
              orderQuantity: metrics.orderQuantity,
              shippedQuantity: metrics.shippedQuantity,
              remainingQuantity: metrics.remainingQuantity,
            },
          ],
        });
      }
    });
    return Array.from(summaryMap.values())
      .filter((row) => row.remainingQuantity !== 0)
      .map((row) => ({
        ...row,
        orders: [...row.orders].sort((a, b) => a.orderNo.localeCompare(b.orderNo, "ja")),
      }))
      .sort((a, b) => a.customerName.localeCompare(b.customerName, "ja"));
  }, [endDate, rows, startDate]);

  const handleToggleCustomer = (customerName: string) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(customerName)) {
        next.delete(customerName);
      } else {
        next.add(customerName);
      }
      return next;
    });
  };

  return (
    <Modal
      open={open}
      title={tx("顧客別残注数サマリー")}
      onClose={onClose}
      actions={
        <div className="flex w-full items-center justify-end">
          <Button variant="outlined" onClick={onClose}>
            {tx("閉じる")}
          </Button>
        </div>
      }
      maxWidth="md"
    >
      <div className="flex flex-col gap-1">
        <div className="text-xs text-gray-500">{tx("期間条件: 受注日")}</div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
          <label className="text-sm font-semibold text-gray-700">{tx("開始日")}</label>
          <TextField size="small" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <span className="text-gray-400">〜</span>
          <label className="text-sm font-semibold text-gray-700">{tx("終了日")}</label>
          <TextField size="small" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
      </div>

      <TableContainer component={Paper} elevation={0} className="rounded-lg border border-gray-200 overflow-hidden">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f8fafc" }}>
              <TableCell sx={headerCellSx}>{tx("顧客名")}</TableCell>
              <TableCell sx={headerCellSx}>PO No.</TableCell>
              <TableCell align="right" sx={headerCellSx}>
                {tx("合計注数")}
              </TableCell>
              <TableCell align="right" sx={headerCellSx}>
                {tx("合計出荷数")}
              </TableCell>
              <TableCell align="right" sx={headerCellSx}>
                {tx("残注数")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {summaryRows.length ? (
              summaryRows.map((row) => {
                const isExpanded = expandedCustomers.has(row.customerName);
                return (
                  <Fragment key={row.customerName}>
                    <TableRow>
                      <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }}>
                        <button
                          type="button"
                          onClick={() => handleToggleCustomer(row.customerName)}
                          className="flex items-center gap-1 rounded px-1 py-1 text-left hover:bg-gray-100"
                          aria-expanded={isExpanded}
                          aria-label={`${row.customerName} ${isExpanded ? "collapse" : "expand"}`}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span>{row.customerName}</span>
                        </button>
                      </TableCell>
                      <TableCell sx={{ ...bodyCellSx, color: "#6b7280" }}>-</TableCell>
                      <TableCell align="right" sx={bodyCellSx}>
                        {amountFormatter.format(row.orderQuantity)}
                      </TableCell>
                      <TableCell align="right" sx={bodyCellSx}>
                        {amountFormatter.format(row.shippedQuantity)}
                      </TableCell>
                      <TableCell align="right" sx={{ ...bodyCellSx, fontWeight: 600, color: "#f97316" }}>
                        {amountFormatter.format(row.remainingQuantity)}
                      </TableCell>
                    </TableRow>
                    {isExpanded
                      ? row.orders.map((order) => (
                          <TableRow key={`${row.customerName}-${order.salesOrderId}`} sx={{ backgroundColor: "#f8fafc" }}>
                            <TableCell sx={bodyCellSx} />
                            <TableCell sx={{ ...bodyCellSx, fontWeight: 600, color: "#1d4ed8" }}>
                              {order.orderNo || "-"}
                            </TableCell>
                            <TableCell align="right" sx={bodyCellSx}>
                              {amountFormatter.format(order.orderQuantity)}
                            </TableCell>
                            <TableCell align="right" sx={bodyCellSx}>
                              {amountFormatter.format(order.shippedQuantity)}
                            </TableCell>
                            <TableCell align="right" sx={{ ...bodyCellSx, fontWeight: 600, color: "#f97316" }}>
                              {amountFormatter.format(order.remainingQuantity)}
                            </TableCell>
                          </TableRow>
                        ))
                      : null}
                  </Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} sx={{ ...bodyCellSx, textAlign: "center", color: "#6b7280", py: 3 }}>
                  {tx("該当する残注数はありません")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Modal>
  );
}
