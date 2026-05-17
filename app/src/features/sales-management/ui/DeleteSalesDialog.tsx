"use client";

import { useState } from "react";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import Modal from "@/components/Modal";
import type { SalesRow } from "@/features/sales-management/types";
import { useLanguage } from "@/lib/i18n/language";

type DeleteSalesDialogProps = {
  open: boolean;
  sales: SalesRow | null;
  onClose: () => void;
  onConfirm: (sales: SalesRow) => void;
};

export default function DeleteSalesDialog({ open, sales, onClose, onConfirm }: DeleteSalesDialogProps) {
  const { language, tx } = useLanguage();
  const tr = (ja: string, vi: string) => (language === "vi" ? vi : ja);
  const [confirmed, setConfirmed] = useState(false);

  const handleClose = () => {
    setConfirmed(false);
    onClose();
  };

  const handleConfirm = () => {
    if (!sales) {
      return;
    }
    onConfirm(sales);
    setConfirmed(false);
  };

  const firstItem = sales?.items[0];
  const extraCount = sales ? Math.max(sales.items.length - 1, 0) : 0;
  const salesLabel = sales
    ? `${sales.orderNo} / ${firstItem ? `${firstItem.productCode} ${firstItem.productName}` : tx("明細")}${
        extraCount ? tr(` 他${extraCount}件`, ` ${extraCount} mục khác`) : ""
      }`
    : "";

  return (
    <Modal
      open={open}
      title={tx("削除確認")}
      onClose={handleClose}
      actions={
        <>
          <Button variant="outlined" onClick={handleClose}>
            {tx("キャンセル")}
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirm} disabled={!confirmed}>
            {tx("削除")}
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-700">
        {sales
          ? tr(`「${salesLabel}」を削除してもよろしいですか？`, `Bạn có chắc chắn muốn xóa "${salesLabel}" không?`)
          : tx("削除してもよろしいですか？")}
      </div>
      <FormControlLabel
        control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />}
        label={tx("削除することを確認しました")}
      />
    </Modal>
  );
}
