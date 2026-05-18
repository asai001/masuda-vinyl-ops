"use client";

import React from "react";
import { Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, type SxProps, type Theme } from "@mui/material";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language";
import { translateNode } from "@/lib/i18n/translateNode";

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
  const { tx } = useLanguage();
  const translatedChildren = React.useMemo(() => translateNode(children, tx), [children, tx]);
  const translatedActions = React.useMemo(() => translateNode(actions, tx), [actions, tx]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={{ sx: { width: "100%", ...paperSx, maxWidth: "70vw" } }}
    >
      <DialogTitle className="flex items-center justify-between" sx={{ px: 3, py: 2 }}>
        {translateNode(title, tx)}
        {showCloseButton ? (
          <IconButton onClick={onClose} size="small">
            <X size={16} />
          </IconButton>
        ) : null}
      </DialogTitle>
      <Divider />
      <DialogContent className="flex flex-col gap-4" sx={{ px: 3, py: 2, ...contentSx }}>
        {translatedChildren}
      </DialogContent>
      {actions ? (
        <>
          <Divider />
          <DialogActions sx={{ px: 3, py: 2 }}>{translatedActions}</DialogActions>
        </>
      ) : null}
    </Dialog>
  );
}
