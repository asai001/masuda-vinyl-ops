"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from "@mui/material";
import Modal from "@/components/Modal";
import { calculateSalesMetrics } from "@/features/sales-management/salesManagementUtils";
import { SalesRow } from "@/mock/salesManagementData";

type SummaryRow = {
  customerName: string;
  orderQuantity: number;
  shippedQuantity: number;
  remainingQuantity: number;
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
  const [startDate, setStartDate] = useState(() => getDefaultDateRange().startDate);
  const [endDate, setEndDate] = useState(() => getDefaultDateRange().endDate);

  useEffect(() => {
    if (!open) {
      return;
    }
    const defaultRange = getDefaultDateRange();
    setStartDate(defaultRange.startDate);
    setEndDate(defaultRange.endDate);
  }, [open]);

  const summaryRows = useMemo<SummaryRow[]>(() => {
    const summaryMap = new Map<string, SummaryRow>();
    rows.forEach((row) => {
      if (!isWithinRange(row.orderDate, startDate, endDate)) {
        return;
      }
      const metrics = calculateSalesMetrics(row.items);
      const existing = summaryMap.get(row.customerName);
      if (existing) {
        existing.orderQuantity += metrics.orderQuantity;
        existing.shippedQuantity += metrics.shippedQuantity;
        existing.remainingQuantity += metrics.remainingQuantity;
      } else {
        summaryMap.set(row.customerName, {
          customerName: row.customerName,
          orderQuantity: metrics.orderQuantity,
          shippedQuantity: metrics.shippedQuantity,
          remainingQuantity: metrics.remainingQuantity,
        });
      }
    });
    return Array.from(summaryMap.values()).filter((row) => row.remainingQuantity !== 0);
  }, [endDate, rows, startDate]);

  return (
    <Modal
      open={open}
      title="顧客別残注数サマリー"
      onClose={onClose}
      actions={
        <div className="flex w-full items-center justify-end">
          <Button variant="outlined" onClick={onClose}>
            閉じる
          </Button>
        </div>
      }
      maxWidth="md"
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
        <label className="text-sm font-semibold text-gray-700">開始日</label>
        <TextField size="small" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        <span className="text-gray-400">〜</span>
        <label className="text-sm font-semibold text-gray-700">終了日</label>
        <TextField size="small" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
      </div>

      <TableContainer component={Paper} elevation={0} className="rounded-lg border border-gray-200 overflow-hidden">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f8fafc" }}>
              <TableCell sx={headerCellSx}>顧客名</TableCell>
              <TableCell align="right" sx={headerCellSx}>
                合計注数
              </TableCell>
              <TableCell align="right" sx={headerCellSx}>
                合計出荷数
              </TableCell>
              <TableCell align="right" sx={headerCellSx}>
                残注数
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {summaryRows.length ? (
              summaryRows.map((row) => (
                <TableRow key={row.customerName}>
                  <TableCell sx={{ ...bodyCellSx, fontWeight: 600 }}>{row.customerName}</TableCell>
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} sx={{ ...bodyCellSx, textAlign: "center", color: "#6b7280", py: 3 }}>
                  該当する残注数はありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Modal>
  );
}
