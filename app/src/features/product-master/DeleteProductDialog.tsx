"use client";

import React from "react";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import Modal from "@/components/Modal";
import type { ProductRow } from "./types";

type DeleteProductDialogProps = {
  open: boolean;
  product: ProductRow | null;
  onClose: () => void;
  onConfirm: (product: ProductRow) => void;
};

export default function DeleteProductDialog({ open, product, onClose, onConfirm }: DeleteProductDialogProps) {
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
          <Button
            variant="contained"
            color="error"
            onClick={() => product && onConfirm(product)}
            disabled={!confirmed}
          >
            削除
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-700">
        {product ? `「${product.name}」を削除してもよろしいですか？` : "削除してもよろしいですか？"}
      </div>
      <FormControlLabel
        control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />}
        label="削除することを確認しました"
      />
    </Modal>
  );
}
