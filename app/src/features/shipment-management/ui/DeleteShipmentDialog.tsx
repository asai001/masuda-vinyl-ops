"use client";

import React from "react";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import Modal from "@/components/Modal";
import type { ShipmentRow } from "@/features/shipment-management/types";

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
          <Button variant="contained" color="error" onClick={() => shipment && onConfirm(shipment)} disabled={!confirmed}>
            削除
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-700">
        {shipment ? `「${shipment.shipmentNo}」を削除してもよろしいですか？` : "削除してもよろしいですか？"}
      </div>
      <FormControlLabel
        control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />}
        label="削除することを確認しました"
      />
    </Modal>
  );
}
