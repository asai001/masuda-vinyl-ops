"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, CircularProgress, TextField } from "@mui/material";
import Modal from "@/components/Modal";
import type { ClientRow } from "@/features/client-master/types";
import type { OrderRow } from "@/features/order-management/types";
import type { OrderIssueExcelPayload } from "@/features/order-management/orderIssueExcel";

type OrderIssueModalProps = {
  open: boolean;
  order: OrderRow | null;
  onClose: () => void;
  clients?: ClientRow[];
};

const amountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 6,
});

const sanitizeFileName = (value: string) => {
  const trimmed = value.trim();
  const sanitized = trimmed.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "");
  return sanitized || "order";
};

const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return amountFormatter.format(value);
};

const toIsoDate = (value?: string | null) => {
  if (!value) {
    return "";
  }
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  const date = new Date(parsed);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const buildSupplierContactLabel = (contactPerson?: string, phone?: string) => {
  const person = contactPerson?.trim() ?? "";
  const phoneNumber = phone?.trim() ?? "";
  if (person && phoneNumber) {
    return `${person}:${phoneNumber}`;
  }
  return person || phoneNumber;
};

const requestOrderIssueExcelBlob = async (payload: OrderIssueExcelPayload, signal?: AbortSignal) => {
  const response = await fetch("/api/order-issue-excel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Excelファイルの発行に失敗しました (${response.status})`);
  }
  return response.blob();
};

export default function OrderIssueModal({ open, order, onClose, clients = [] }: OrderIssueModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [orderNumberInput, setOrderNumberInput] = useState("");
  const [issueError, setIssueError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setOrderNumberInput("");
      setIssueError(null);
      return;
    }
    if (!order) {
      setOrderNumberInput("");
      return;
    }
    setIssueError(null);
    setOrderNumberInput(`PO-${String(order.id).padStart(4, "0")}`);
  }, [open, order]);

  const defaultOrderNumber = order ? `PO-${String(order.id).padStart(4, "0")}` : "-";
  const resolvedOrderNumber = orderNumberInput.trim() || defaultOrderNumber;

  const supplierInfo = useMemo(() => {
    if (!order) {
      return null;
    }
    return clients.find((row) => row.name === order.supplier) ?? null;
  }, [clients, order]);

  const supplierAddress = supplierInfo?.address?.trim() ?? "";
  const supplierContact = useMemo(
    () => buildSupplierContactLabel(supplierInfo?.contactPerson, supplierInfo?.phone),
    [supplierInfo?.contactPerson, supplierInfo?.phone],
  );

  const lineItems = useMemo(() => {
    if (!order) {
      return [];
    }
    return order.items.map((item) => ({
      name: item.itemName ?? "",
      unit: item.unit ?? "",
      quantity: Number.isFinite(item.quantity) ? item.quantity : 0,
      unitPrice: Number.isFinite(item.unitPrice) ? item.unitPrice : 0,
      deliveryDate: toIsoDate(order.deliveryDate),
    }));
  }, [order]);

  const displayedLineItems = useMemo(() => lineItems.slice(0, 7), [lineItems]);

  const totalAmountLabel = useMemo(() => {
    if (!order) {
      return "-";
    }
    const total = displayedLineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    if (!order.currency) {
      return formatNumber(total);
    }
    return `${formatNumber(total)} ${order.currency}`;
  }, [displayedLineItems, order]);

  const excelPayload = useMemo<OrderIssueExcelPayload | null>(() => {
    if (!order) {
      return null;
    }
    return {
      orderNumber: resolvedOrderNumber,
      issueDate: toIsoDate(order.orderDate),
      supplierName: order.supplier ?? "",
      supplierAddress,
      supplierContact,
      currency: order.currency ?? "",
      lineItems,
    };
  }, [lineItems, order, resolvedOrderNumber, supplierAddress, supplierContact]);

  const handleDownload = async () => {
    if (!excelPayload || isDownloading) {
      return;
    }
    setIssueError(null);
    setIsDownloading(true);
    try {
      const blob = await requestOrderIssueExcelBlob(excelPayload);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `発注書-${sanitizeFileName(resolvedOrderNumber)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (error) {
      console.error("Failed to issue order excel", error);
      setIssueError("Excelファイルの発行に失敗しました。");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="注文書の発行"
      onClose={onClose}
      actions={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outlined" onClick={onClose} disabled={isDownloading}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleDownload}
            disabled={!order || isDownloading}
            startIcon={isDownloading ? <CircularProgress color="inherit" size={16} /> : null}
          >
            {isDownloading ? "発行中" : "発行"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="text-sm text-gray-700">テンプレート（発注フォーム.xlsx）から注文書をExcel形式で発行します。</div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">注番</label>
          <TextField
            size="small"
            placeholder={defaultOrderNumber}
            value={orderNumberInput}
            onChange={(event) => setOrderNumberInput(event.target.value)}
            disabled={!order || isDownloading}
          />
        </div>
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <div>発注日: {toIsoDate(order?.orderDate)}</div>
          <div>仕入先: {order?.supplier ?? "-"}</div>
          <div>明細行数: {displayedLineItems.length} / 7</div>
          <div>合計: {totalAmountLabel}</div>
        </div>
        {issueError ? <div className="text-sm text-red-600">{issueError}</div> : null}
      </div>
    </Modal>
  );
}
