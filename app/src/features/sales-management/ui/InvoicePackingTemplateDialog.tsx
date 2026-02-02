"use client";

import { useState } from "react";
import { Button, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import Modal from "@/components/Modal";
import type { InvoicePackingTemplate } from "@/features/sales-management/invoicePackingList";
import type { SalesRow } from "@/features/sales-management/types";

type InvoicePackingTemplateDialogProps = {
  open: boolean;
  sales: SalesRow | null;
  onClose: () => void;
  onSelect: (template: InvoicePackingTemplate) => void;
};

type TemplateOption = {
  value: InvoicePackingTemplate;
  label: string;
  description: string;
};

const templateOptions: TemplateOption[] = [
  {
    value: "client",
    label: "取引先用",
    description: "取引先に送付するテンプレート",
  },
  {
    value: "hq",
    label: "本社用",
    description: "社内保管用のテンプレート",
  },
];

export default function InvoicePackingTemplateDialog({
  open,
  sales,
  onClose,
  onSelect,
}: InvoicePackingTemplateDialogProps) {
  const [selected, setSelected] = useState<InvoicePackingTemplate>("client");

  const handleSelect = () => {
    if (!sales) {
      return;
    }
    onSelect(selected);
  };

  const orderLabel = sales?.orderNo ? `（PO No. ${sales.orderNo}）` : "";

  return (
    <Modal
      open={open}
      title={`インボイス・パッキングリストの発行${orderLabel}`}
      onClose={onClose}
      actions={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outlined" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={handleSelect} disabled={!sales}>
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
        {templateOptions.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio />}
            label={
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800">{option.label}</span>
                <span className="text-xs text-gray-500">{option.description}</span>
              </div>
            }
          />
        ))}
      </RadioGroup>
    </Modal>
  );
}
