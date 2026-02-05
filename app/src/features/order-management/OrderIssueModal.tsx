"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, CircularProgress, TextField } from "@mui/material";
import Modal from "@/components/Modal";
import type { ClientRow } from "@/features/client-master/types";
import type { OrderRow } from "@/features/order-management/types";
import { fetchExchangeRates } from "@/features/settings/api/client";
import type { ExchangeRates } from "@/features/settings/types";
import { renderOrderIssueHtml, type OrderIssuePdfPayload, type PdfFontSources } from "./orderIssueTemplate";

type OrderIssueModalProps = {
  open: boolean;
  order: OrderRow | null;
  onClose: () => void;
  clients?: ClientRow[];
};

const amountFormatter = new Intl.NumberFormat("en-US");
const defaultExchangeRates: ExchangeRates = {
  jpyPerUsd: 150,
  vndPerUsd: 25000,
};
const isAbortError = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

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

export default function OrderIssueModal({ open, order, onClose, clients = [] }: OrderIssueModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [issueNote, setIssueNote] = useState("");
  const [orderNumberInput, setOrderNumberInput] = useState("");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(defaultExchangeRates);
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
      return;
    }
    const ac = new AbortController();
    (async () => {
      try {
        const data = await fetchExchangeRates(ac.signal);
        if (!ac.signal.aborted) {
          setExchangeRates({
            jpyPerUsd: data.jpyPerUsd,
            vndPerUsd: data.vndPerUsd,
          });
        }
      } catch (e) {
        if (!isAbortError(e)) {
          console.error("Failed to load exchange rates", e);
        }
      }
    })();
    return () => ac.abort();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setIssueNote("");
      setOrderNumberInput("");
      return;
    }
    setIssueNote(order?.note?.trim() ?? "");
    if (order) {
      setOrderNumberInput(`PO-${String(order.id).padStart(4, "0")}`);
    } else {
      setOrderNumberInput("");
    }
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
  const defaultOrderNumber = order ? `PO-${String(order.id).padStart(4, "0")}` : "-";
  const resolvedOrderNumber = orderNumberInput.trim() || defaultOrderNumber;
  const supplierName = order?.supplier ?? "取引先名";
  const supplierInfo = useMemo(() => {
    if (!order) {
      return null;
    }
    return clients.find((row) => row.name === order.supplier) ?? null;
  }, [clients, order]);
  const supplierAddress = supplierInfo?.address || "（未設定）";
  const supplierPhone = supplierInfo?.phone || "（未設定）";
  const supplierAddressLine1 = supplierAddress;
  const supplierAddressLine2 = "";

  const safeRates = useMemo(() => {
    const jpyPerUsd =
      Number.isFinite(exchangeRates.jpyPerUsd) && exchangeRates.jpyPerUsd > 0
        ? exchangeRates.jpyPerUsd
        : defaultExchangeRates.jpyPerUsd;
    const vndPerUsd =
      Number.isFinite(exchangeRates.vndPerUsd) && exchangeRates.vndPerUsd > 0
        ? exchangeRates.vndPerUsd
        : defaultExchangeRates.vndPerUsd;
    return { jpyPerUsd, vndPerUsd };
  }, [exchangeRates]);

  const vndRate = useMemo(() => {
    if (!order) {
      return 1;
    }
    switch (order.currency) {
      case "USD":
        return safeRates.vndPerUsd;
      case "JPY":
        return safeRates.vndPerUsd / safeRates.jpyPerUsd;
      case "VND":
      default:
        return 1;
    }
  }, [order, safeRates]);
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
      orderNumber: resolvedOrderNumber,
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
    resolvedOrderNumber,
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
      link.download = `order-${resolvedOrderNumber}.pdf`;
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
      <div className="text-sm">注文書は VND に換算して発行します。</div>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">注番</label>
          <TextField
            size="small"
            placeholder={defaultOrderNumber}
            value={orderNumberInput}
            onChange={(event) => setOrderNumberInput(event.target.value)}
            disabled={!order}
          />
          <div className="text-xs text-gray-500">空欄の場合は自動採番（{defaultOrderNumber}）を使用します。</div>
        </div>
        <div className="mt-6 flex flex-col gap-2">
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
          <div className="text-xs text-gray-500">摘要はシステムには保存されません。</div>
        </div>
        <div className="mt-6 text-sm font-semibold text-gray-700">プレビュー</div>
        <div className="mt-4 flex justify-center">
          <div ref={previewContainerRef} className="w-full max-w-180">
            <div
              className="relative mx-auto overflow-hidden bg-white"
              style={{ width: previewSize.width, height: previewSize.height }}
            >
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
