"use client";

import { useState } from "react";
import { Button, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import Modal from "@/components/Modal";
import type { InvoicePackingTemplate } from "@/features/sales-management/invoicePackingList";
import type { ShipmentRow } from "@/features/shipment-management/types";

type ShipmentInvoiceTemplateDialogProps = {
  open: boolean;
  shipment: ShipmentRow | null;
  onClose: () => void;
  onSelect: (template: InvoicePackingTemplate) => void;
};

export default function ShipmentInvoiceTemplateDialog({
  open,
  shipment,
  onClose,
  onSelect,
}: ShipmentInvoiceTemplateDialogProps) {
  const [selected, setSelected] = useState<InvoicePackingTemplate>("client");

  const handleSelect = () => {
    if (!shipment) {
      return;
    }
    onSelect(selected);
  };

  const shipmentLabel = shipment?.shipmentNo ? `（出荷No. ${shipment.shipmentNo}）` : "";

  return (
    <Modal
      open={open}
      title={`インボイス・パッキングリストの発行${shipmentLabel}`}
      onClose={onClose}
      actions={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outlined" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={handleSelect} disabled={!shipment}>
            発行
          </Button>
        </div>
      }
    >
      <div className="text-sm text-gray-700">発行するテンプレートを選択してください。</div>
      <RadioGroup
        value={selected}
        onChange={(event) => setSelected(event.target.value as InvoicePackingTemplate)}
      >
        <FormControlLabel
          value="client"
          control={<Radio />}
          label={
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-800">取引先用</span>
              <span className="text-xs text-gray-500">取引先に送付するテンプレート</span>
            </div>
          }
        />
        <FormControlLabel
          value="hq"
          control={<Radio />}
          label={
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-800">本社用</span>
              <span className="text-xs text-gray-500">社内保管用のテンプレート</span>
            </div>
          }
        />
      </RadioGroup>
    </Modal>
  );
}
