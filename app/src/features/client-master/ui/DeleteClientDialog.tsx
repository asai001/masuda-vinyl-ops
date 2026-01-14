"use client";

import React from "react";
import { Button, Checkbox, FormControlLabel } from "@mui/material";
import Modal from "@/components/Modal";
import { ClientRow } from "./types";

type DeleteClientDialogProps = {
  open: boolean;
  client: ClientRow | null;
  onClose: () => void;
  onConfirm: (client: ClientRow) => void;
};

export default function DeleteClientDialog({ open, client, onClose, onConfirm }: DeleteClientDialogProps) {
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
          <Button variant="contained" color="error" onClick={() => client && onConfirm(client)} disabled={!confirmed}>
            削除
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-700">
        {client ? `「${client.name}」を削除してもよろしいですか？` : "削除してもよろしいですか？"}
      </div>
      <FormControlLabel
        control={<Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />}
        label="削除することを確認しました"
      />
    </Modal>
  );
}
