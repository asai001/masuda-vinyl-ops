"use client";

import React from "react";
import { Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton } from "@mui/material";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onClose: () => void;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
  fullWidth?: boolean;
  showCloseButton?: boolean;
};

export default function Modal({
  open,
  title,
  children,
  actions,
  onClose,
  maxWidth = "sm",
  fullWidth = true,
  showCloseButton = true,
}: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth={fullWidth}>
      <DialogTitle className="flex items-center justify-between">
        {title}
        {showCloseButton ? (
          <IconButton onClick={onClose} size="small">
            <X size={16} />
          </IconButton>
        ) : null}
      </DialogTitle>
      <Divider />
      <DialogContent className="flex flex-col gap-4">{children}</DialogContent>
      {actions ? (
        <>
          <Divider />
          <DialogActions className="px-6 py-4">{actions}</DialogActions>
        </>
      ) : null}
    </Dialog>
  );
}
