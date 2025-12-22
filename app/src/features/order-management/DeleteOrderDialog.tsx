"use client";

import { useEffect, useState } from "react";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import Modal from "@/components/Modal";
import { OrderRow } from "@/mock/orderManagementData";

type DeleteOrderDialogProps = {
  open: boolean;
  order: OrderRow | null;
  onClose: () => void;
  onConfirm: (order: OrderRow) => void;
};

export default function DeleteOrderDialog({ open, order, onClose, onConfirm }: DeleteOrderDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmed(false);
    }
  }, [open]);

  const firstItem = order?.items[0];
  const extraCount = order ? Math.max(order.items.length - 1, 0) : 0;
  const orderLabel = order
    ? `${firstItem ? `${firstItem.itemCode} ${firstItem.itemName}` : "明細"}${extraCount ? ` 他${extraCount}件` : ""}`
    : "";

  return (
    <Modal
      open={open}
      title="削除確認"
      onClose={onClose}
      actions={
        <>
          <Button variant="outlined" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="contained" color="error" onClick={() => order && onConfirm(order)} disabled={!confirmed}>
            削除
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-700">
        {order ? `「${orderLabel}」を削除してもよろしいですか？` : "削除してもよろしいですか？"}
      </div>
      <FormControlLabel
        control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />}
        label="削除することを確認しました"
      />
    </Modal>
  );
}
