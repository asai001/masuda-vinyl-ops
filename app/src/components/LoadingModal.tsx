"use client";

import React from "react";
import { CircularProgress, Dialog, DialogContent } from "@mui/material";

type LoadingModalProps = {
  open: boolean;
  message?: string;
};

export default function LoadingModal({ open, message = "保存中" }: LoadingModalProps) {
  return (
    <Dialog
      open={open}
      maxWidth={false}
      fullWidth={false}
      onClose={() => {}}
      disableEscapeKeyDown
      slotProps={{
        backdrop: { sx: { backgroundColor: "rgba(0, 0, 0, 0.75)" } },
        paper: {
          elevation: 0,
          sx: {
            borderRadius: "40px",
            minHeight: { xs: "300px", sm: "300px" },
            width: { xs: "150px", sm: "250px" },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
        },
      }}
    >
      <DialogContent className="flex flex-col items-center justify-center gap-4 py-10">
        <CircularProgress size={50} />
        <span className="text-gray-700 mt-8">{message}</span>
      </DialogContent>
    </Dialog>
  );
}
