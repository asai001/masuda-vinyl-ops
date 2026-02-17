"use client";

import React from "react";
import { Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, type SxProps, type Theme } from "@mui/material";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onClose: () => void;
  maxWidth?: false | "xs" | "sm" | "md" | "lg" | "xl";
  fullWidth?: boolean;
  showCloseButton?: boolean;
  contentSx?: SxProps<Theme>;
  paperSx?: SxProps<Theme>;
};

export default function Modal({
  open,
  title,
  children,
  actions,
  onClose,
  maxWidth = false,
  fullWidth = true,
  showCloseButton = true,
  contentSx,
  paperSx,
}: ModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={{ sx: { maxWidth: 800, width: "100%", ...paperSx } }}
    >
      <DialogTitle className="flex items-center justify-between" sx={{ px: 3, py: 2 }}>
        {title}
        {showCloseButton ? (
          <IconButton onClick={onClose} size="small">
            <X size={16} />
          </IconButton>
        ) : null}
      </DialogTitle>
      <Divider />
      <DialogContent className="flex flex-col gap-4" sx={{ px: 3, py: 2, ...contentSx }}>
        {children}
      </DialogContent>
      {actions ? (
        <>
          <Divider />
          <DialogActions sx={{ px: 3, py: 2 }}>{actions}</DialogActions>
        </>
      ) : null}
    </Dialog>
  );
}
