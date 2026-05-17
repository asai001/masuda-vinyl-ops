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
  TextField,
} from "@mui/material";
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
  title?: string;
  showDateRange?: boolean;
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
  backgroundColor: "#f8fafc",
};

const bodyCellSx = {
  fontSize: 13,
  color: "#111827",
  borderBottom: "1px solid #e5e7eb",
  py: 1.75,
};

export default function RemainingOrderSummaryModal({
  open,
  rows,
  onClose,
  title,
  showDateRange = true,
}: RemainingOrderSummaryModalProps) {
  const { language } = useLanguage();
  const tr = (ja: string, vi: string) => (language === "vi" ? vi : ja);
  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(() => new Set());

  const summaryRows = useMemo<SummaryRow[]>(() => {
    const summaryMap = new Map<string, SummaryRow>();

    rows.forEach((row) => {
      if (showDateRange && !isWithinRange(row.orderDate, startDate, endDate)) {
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
        return;
      }

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
    });

    return Array.from(summaryMap.values())
      .filter((row) => row.remainingQuantity !== 0)
      .map((row) => ({
        ...row,
        orders: [...row.orders].sort((left, right) => left.orderNo.localeCompare(right.orderNo, "ja")),
      }))
      .sort((left, right) => left.customerName.localeCompare(right.customerName, "ja"));
  }, [endDate, rows, showDateRange, startDate]);

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
      title={title ?? tr("残注数サマリー", "Tổng hợp số lượng còn lại")}
      onClose={onClose}
      actions={
        <div className="flex w-full items-center justify-end">
          <Button variant="outlined" onClick={onClose}>
            {tr("閉じる", "Đóng")}
          </Button>
        </div>
      }
      maxWidth="md"
      paperSx={{ height: "80vh", maxHeight: "80vh" }}
      contentSx={{ overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      {showDateRange ? (
        <div className="flex flex-col gap-1">
          <div className="text-xs text-gray-500">{tr("集計基準: 受注日", "Tiêu chí tổng hợp: Ngày đặt hàng")}</div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
            <label className="text-sm font-semibold text-gray-700">{tr("開始日", "Ngày bắt đầu")}</label>
            <TextField size="small" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <span className="text-gray-400">〜</span>
            <label className="text-sm font-semibold text-gray-700">{tr("終了日", "Ngày kết thúc")}</label>
            <TextField size="small" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <TableContainer
          component={Paper}
          elevation={0}
          className="rounded-lg border border-gray-200 overflow-hidden"
          sx={{ maxHeight: "100%", overflowY: "auto" }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>{tr("顧客名", "Tên khách hàng")}</TableCell>
                <TableCell sx={headerCellSx}>PO No.</TableCell>
                <TableCell align="right" sx={headerCellSx}>
                  {tr("受注数", "Số lượng đặt hàng")}
                </TableCell>
                <TableCell align="right" sx={headerCellSx}>
                  {tr("累計出荷数", "Số lượng đã xuất lũy kế")}
                </TableCell>
                <TableCell align="right" sx={headerCellSx}>
                  {tr("残出荷数", "Số lượng chưa xuất")}
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
                            aria-label={`${row.customerName} ${isExpanded ? tr("折りたたむ", "Thu gọn") : tr("展開", "Mở rộng")}`}
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
                    {tr("該当する残出荷数はありません", "Không có số lượng chưa xuất tương ứng")}
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
