"use client";

import React from "react";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import Modal from "@/components/Modal";
import { PaymentRow } from "@/mock/paymentMasterData";

type DeletePaymentDialogProps = {
  open: boolean;
  payment: PaymentRow | null;
  onClose: () => void;
  onConfirm: (payment: PaymentRow) => void;
};

export default function DeletePaymentDialog({ open, payment, onClose, onConfirm }: DeletePaymentDialogProps) {
  const [confirmed, setConfirmed] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setConfirmed(false);
    }
  }, [open]);

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
          <Button variant="contained" color="error" onClick={() => payment && onConfirm(payment)} disabled={!confirmed}>
            削除
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-700">
        {payment ? `「${payment.content}」を削除してもよろしいですか？` : "削除してもよろしいですか？"}
      </div>
      <FormControlLabel
        control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />}
        label="削除することを確認しました"
      />
    </Modal>
  );
}
