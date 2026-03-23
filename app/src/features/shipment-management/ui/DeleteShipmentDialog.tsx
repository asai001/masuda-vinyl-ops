"use client";

import React from "react";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import Modal from "@/components/Modal";
import type { ShipmentRow } from "@/features/shipment-management/types";
import { useLanguage } from "@/lib/i18n/language";

type DeleteShipmentDialogProps = {
  open: boolean;
  shipment: ShipmentRow | null;
  onClose: () => void;
  onConfirm: (shipment: ShipmentRow) => void;
};

export default function DeleteShipmentDialog({
  open,
  shipment,
  onClose,
  onConfirm,
}: DeleteShipmentDialogProps) {
  const { language } = useLanguage();
  const tr = (ja: string, vi: string) => (language === "vi" ? vi : ja);
  const [confirmed, setConfirmed] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setConfirmed(false);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      title={tr("削除確認", "Xác nhận xóa")}
      onClose={onClose}
      actions={
        <>
          <Button variant="outlined" onClick={onClose}>
            {tr("キャンセル", "Hủy")}
          </Button>
          <Button variant="contained" color="error" onClick={() => shipment && onConfirm(shipment)} disabled={!confirmed}>
            {tr("削除", "Xóa")}
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-700">
        {shipment
          ? tr(`「${shipment.shipmentNo}」を削除してもよろしいですか？`, `Bạn có chắc chắn muốn xóa "${shipment.shipmentNo}" không?`)
          : tr("削除してもよろしいですか？", "Bạn có chắc chắn muốn xóa không?")}
      </div>
      <FormControlLabel
        control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />}
        label={tr("削除することを確認しました", "Tôi xác nhận xóa mục này")}
      />
    </Modal>
  );
}
