"use client";

import { useMemo, useState } from "react";
import { Button, CircularProgress, Tab, Tabs } from "@mui/material";
import Modal from "@/components/Modal";
import type { InvoicePackingPayload } from "@/features/sales-management/invoicePackingList";
import {
  renderInvoicePreviewHtml,
  renderPackingListPreviewHtml,
} from "@/features/sales-management/invoicePackingPreview";

type PreviewTab = "invoice" | "packing";

type InvoicePackingPreviewModalProps = {
  open: boolean;
  payload: InvoicePackingPayload | null;
  loading?: boolean;
  issuing?: boolean;
  onClose: () => void;
  onIssue: () => void;
};

export default function InvoicePackingPreviewModal({
  open,
  payload,
  loading = false,
  issuing = false,
  onClose,
  onIssue,
}: InvoicePackingPreviewModalProps) {
  const [tab, setTab] = useState<PreviewTab>("invoice");

  const handleClose = () => {
    setTab("invoice");
    onClose();
  };

  const invoiceHtml = useMemo(() => (payload ? renderInvoicePreviewHtml(payload) : ""), [payload]);
  const packingHtml = useMemo(() => (payload ? renderPackingListPreviewHtml(payload) : ""), [payload]);

  const previewHtml = tab === "invoice" ? invoiceHtml : packingHtml;
  const canIssue = Boolean(payload) && !loading && !issuing;

  return (
    <Modal
      open={open}
      title="インボイス・パッキングリスト プレビュー"
      onClose={handleClose}
      paperSx={{ width: "70vw", height: "70vh", maxWidth: "70vw" }}
      contentSx={{ overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}
      actions={
        <div className="flex w-full items-center gap-2">
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outlined" onClick={handleClose}>
              キャンセル
            </Button>
            <Button
              variant="contained"
              onClick={onIssue}
              disabled={!canIssue}
              startIcon={issuing ? <CircularProgress size={16} /> : null}
            >
              {issuing ? "発行中..." : "発行"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3 min-h-0 flex-1">
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value as PreviewTab)}
          variant="standard"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="INVOICE" value="invoice" />
          <Tab label="PACKING LIST" value="packing" />
        </Tabs>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 p-3">
            {loading ? (
              <div className="flex w-full items-center justify-center text-sm text-gray-500">
                プレビューを生成しています...
              </div>
            ) : payload ? (
              <iframe
                title={tab === "invoice" ? "invoice-preview" : "packing-preview"}
                className="h-full w-full border-0 bg-white"
                srcDoc={previewHtml}
              />
            ) : (
              <div className="flex w-full items-center justify-center text-sm text-gray-500">
                プレビューを表示できません。
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
