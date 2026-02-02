"use client";

import React from "react";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import Modal from "@/components/Modal";
import { MaterialRow } from "../types";

type DeleteMaterialDialogProps = {
  open: boolean;
  material: MaterialRow | null;
  onClose: () => void;
  onConfirm: (material: MaterialRow) => void;
};

export default function DeleteMaterialDialog({ open, material, onClose, onConfirm }: DeleteMaterialDialogProps) {
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
            onClick={() => material && onConfirm(material)}
            disabled={!confirmed}
          >
            削除
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-700">
        {material ? `「${material.name}」を削除してもよろしいですか？` : "削除してもよろしいですか？"}
      </div>
      <FormControlLabel
        control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />}
        label="削除することを確認しました"
      />
    </Modal>
  );
}
