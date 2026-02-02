"use client";

import React from "react";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import Modal from "@/components/Modal";
import { ClientRow } from "../types";

type DeleteClientDialogProps = {
  open: boolean;
  client: ClientRow | null;
  onClose: () => void;
  onConfirm: (client: ClientRow) => void;
  isDeleting?: boolean;
};

export default function DeleteClientDialog({ open, client, onClose, onConfirm, isDeleting = false }: DeleteClientDialogProps) {
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
          <Button variant="outlined" onClick={onClose} disabled={isDeleting}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => client && onConfirm(client)}
            disabled={!confirmed || isDeleting}
          >
            削除
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-700">
        {client ? `「${client.name}」を削除してもよろしいですか？` : "削除してもよろしいですか？"}
      </div>
      <FormControlLabel
        control={
          <Checkbox
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            disabled={isDeleting}
          />
        }
        label="削除することを確認しました"
      />
    </Modal>
  );
}
