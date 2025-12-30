"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, CircularProgress, TextField } from "@mui/material";
import Modal from "@/components/Modal";
import { clientRows } from "@/mock/clientMasterData";
import { OrderRow } from "@/mock/orderManagementData";
import { renderOrderIssueHtml, type OrderIssuePdfPayload, type PdfFontSources } from "./orderIssueTemplate";

type OrderIssueModalProps = {
  open: boolean;
  order: OrderRow | null;
  onClose: () => void;
};

const amountFormatter = new Intl.NumberFormat("en-US");
const vndExchangeRates = {
  VND: 1,
  USD: 25000,
  JPY: 170,
} as const;

const previewFontSources: PdfFontSources = {
  jpRegular: "/fonts/NotoSerifJP-Regular.ttf",
  jpBold: "/fonts/NotoSerifJP-Bold.ttf",
  vnRegular: "/fonts/NotoSerif-Regular.ttf",
  vnBold: "/fonts/NotoSerif-Bold.ttf",
};
const formatIssueDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) {
    return value;
  }
  const [, year, month, day] = match;
  return `${Number(day)}/${Number(month)}/${year}`;
};
const a4WidthPx = (210 / 25.4) * 96;
const a4HeightPx = (297 / 25.4) * 96;
type PreviewSize = { width: number; height: number };
const requestPdfBlob = async (payload: OrderIssuePdfPayload, signal?: AbortSignal) => {
  const response = await fetch("/api/order-issue-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) {
    throw new Error(`PDF生成に失敗しました (${response.status})`);
  }
  return response.blob();
};

export default function OrderIssueModal({ open, order, onClose }: OrderIssueModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [issueNote, setIssueNote] = useState("");
  const [previewScale, setPreviewScale] = useState(1);
  const [previewContentSize, setPreviewContentSize] = useState<PreviewSize>({
    width: a4WidthPx,
    height: a4HeightPx,
  });
  const [previewSize, setPreviewSize] = useState<PreviewSize>({
    width: a4WidthPx,
    height: a4HeightPx,
  });
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!open) {
      setIssueNote("");
      return;
    }
    setIssueNote(order?.note?.trim() ?? "");
  }, [open, order]);

  const applyScale = (contentSize: PreviewSize) => {
    const element = previewContainerRef.current;
    if (!element) {
      return;
    }
    const width = element.clientWidth;
    if (!width) {
      return;
    }
    const rect = element.getBoundingClientRect();
    const dialogContent = element.closest(".MuiDialogContent-root");
    const contentRect = dialogContent?.getBoundingClientRect();
    const availableHeight = contentRect ? contentRect.bottom - rect.top : window.innerHeight - rect.top - 24;
    const padding = 16;
    const maxWidth = Math.max(0, width - padding);
    const maxHeight = Math.max(0, availableHeight - padding);
    if (!maxWidth || !maxHeight) {
      return;
    }
    const scale = Math.min(1, maxWidth / contentSize.width, maxHeight / contentSize.height);
    setPreviewScale(scale);
    setPreviewSize({ width: contentSize.width * scale, height: contentSize.height * scale });
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    applyScale(previewContentSize);
    const element = previewContainerRef.current;
    if (!element) {
      return;
    }
    const handleResize = () => applyScale(previewContentSize);
    const observer = new ResizeObserver(handleResize);
    observer.observe(element);
    window.addEventListener("resize", handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [open, previewContentSize]);
  const issueDate = formatIssueDate(order?.orderDate);
  const orderNumber = order ? `PO-${String(order.id).padStart(4, "0")}` : "-";
  const supplierName = order?.supplier ?? "取引先名";
  const supplierInfo = useMemo(() => {
    if (!order) {
      return null;
    }
    return clientRows.find((row) => row.name === order.supplier) ?? null;
  }, [order]);
  const supplierAddress = supplierInfo?.address || "（未設定）";
  const supplierPhone = supplierInfo?.phone || "（未設定）";
  const supplierAddressLine1 = supplierAddress;
  const supplierAddressLine2 = "";

  const vndRate = useMemo(() => {
    if (!order) {
      return vndExchangeRates.VND;
    }
    return vndExchangeRates[order.currency as keyof typeof vndExchangeRates] ?? vndExchangeRates.VND;
  }, [order]);
  const amountLabel = useMemo(() => {
    if (!order) {
      return "-";
    }
    const totalAmount = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * vndRate;
    return amountFormatter.format(totalAmount);
  }, [order, vndRate]);
  const lineItems = useMemo(() => {
    if (!order) {
      return [];
    }
    return order.items.map((item) => ({
      name: item.itemName,
      unit: item.unit || "-",
      quantity: amountFormatter.format(item.quantity),
      unitPrice: amountFormatter.format(item.unitPrice * vndRate),
      deliveryDate: order.deliveryDate,
      amount: amountFormatter.format(item.quantity * item.unitPrice * vndRate),
    }));
  }, [order, vndRate]);
  const noteLabel = issueNote.trim();

  const pdfPayload = useMemo<OrderIssuePdfPayload | null>(() => {
    if (!order) {
      return null;
    }
    return {
      orderNumber,
      issueDate,
      supplierName,
      supplierAddressLine1,
      supplierAddressLine2,
      supplierPhone,
      lineItems,
      amountLabel,
      note: noteLabel,
    };
  }, [
    order,
    orderNumber,
    issueDate,
    supplierName,
    supplierAddressLine1,
    supplierAddressLine2,
    supplierPhone,
    lineItems,
    amountLabel,
    noteLabel,
  ]);

  const previewHtml = useMemo(() => {
    if (!pdfPayload) {
      return "";
    }
    return renderOrderIssueHtml(pdfPayload, previewFontSources);
  }, [pdfPayload]);
  const handleDownload = async () => {
    if (!pdfPayload || isDownloading) {
      return;
    }
    setIsDownloading(true);
    try {
      const blob = await requestPdfBlob(pdfPayload);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `order-${orderNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download order PDF", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const previewMessageClass = "flex h-full items-center justify-center text-sm text-gray-500";
  const handlePreviewLoad = () => {
    const frame = previewFrameRef.current;
    if (!frame) {
      return;
    }
    const measureContent = () => {
      const doc = frame.contentDocument;
      const rootRect = doc?.documentElement?.getBoundingClientRect();
      const bodyRect = doc?.body?.getBoundingClientRect();
      const width = Math.max(bodyRect?.width ?? 0, rootRect?.width ?? 0, a4WidthPx);
      const height = Math.max(bodyRect?.height ?? 0, rootRect?.height ?? 0, a4HeightPx);
      const nextSize = { width, height };
      setPreviewContentSize(nextSize);
      applyScale(nextSize);
    };
    measureContent();
    const doc = frame.contentDocument;
    if (doc?.fonts?.ready) {
      doc.fonts.ready.then(measureContent).catch(() => {
        // Ignore font load errors for preview scaling.
      });
    }
  };

  return (
    <Modal
      open={open}
      title="注文書の発行"
      onClose={onClose}
      actions={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outlined" onClick={onClose}>
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
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">摘要（発行時のみ）</label>
          <TextField
            size="small"
            multiline
            minRows={3}
            placeholder="摘要を入力（任意）"
            value={issueNote}
            onChange={(event) => setIssueNote(event.target.value)}
            disabled={!order}
          />
          <div className="text-xs text-gray-500">注文には保存されません。</div>
        </div>
        <div className="mt-6 text-sm font-semibold text-gray-700">プレビュー</div>
        <div className="mt-4 flex justify-center">
          <div ref={previewContainerRef} className="w-full max-w-180">
            <div className="relative mx-auto overflow-hidden bg-white" style={{ width: previewSize.width, height: previewSize.height }}>
              {open ? (
                pdfPayload ? (
                  <iframe
                    title="注文書プレビュー"
                    className="block border-0 bg-white"
                    ref={previewFrameRef}
                    scrolling="no"
                    style={{
                      width: previewContentSize.width,
                      height: previewContentSize.height,
                      overflow: "hidden",
                      transform: `scale(${previewScale})`,
                      transformOrigin: "top left",
                    }}
                    srcDoc={previewHtml}
                    onLoad={handlePreviewLoad}
                  />
                ) : (
                  <div className={previewMessageClass}>プレビューを生成できません。</div>
                )
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
