"use client";

import { useState } from "react";
import { Button, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import Modal from "@/components/Modal";
import type { InvoicePackingTemplate } from "@/features/sales-management/invoicePackingList";
import type { ShipmentRow } from "@/features/shipment-management/types";
import { useLanguage } from "@/lib/i18n/language";

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
  const { language } = useLanguage();
  const tr = (ja: string, vi: string) => (language === "vi" ? vi : ja);
  const [selected, setSelected] = useState<InvoicePackingTemplate>("client");

  const handleSelect = () => {
    if (!shipment) {
      return;
    }
    onSelect(selected);
  };

  const shipmentLabel = shipment?.shipmentNo
    ? tr(`（出荷No. ${shipment.shipmentNo}）`, `(Số xuất hàng ${shipment.shipmentNo})`)
    : "";

  return (
    <Modal
      open={open}
      title={tr(`インボイス・パッキングリストの発行${shipmentLabel}`, `Phát hành Invoice / Packing List ${shipmentLabel}`)}
      onClose={onClose}
      actions={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outlined" onClick={onClose}>
            {tr("キャンセル", "Hủy")}
          </Button>
          <Button variant="contained" onClick={handleSelect} disabled={!shipment}>
            {tr("発行", "Phát hành")}
          </Button>
        </div>
      }
    >
      <div className="text-sm text-gray-700">{tr("発行するテンプレートを選択してください。", "Vui lòng chọn mẫu cần phát hành.")}</div>
      <RadioGroup
        value={selected}
        onChange={(event) => setSelected(event.target.value as InvoicePackingTemplate)}
      >
        <FormControlLabel
          value="client"
          control={<Radio />}
          label={
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-800">{tr("取引先用", "Dùng cho khách hàng")}</span>
              <span className="text-xs text-gray-500">{tr("取引先に送付するテンプレート", "Mẫu gửi cho khách hàng")}</span>
            </div>
          }
        />
        <FormControlLabel
          value="hq"
          control={<Radio />}
          label={
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-800">{tr("本社用", "Dùng cho trụ sở")}</span>
              <span className="text-xs text-gray-500">{tr("社内保管用のテンプレート", "Mẫu lưu nội bộ")}</span>
            </div>
          }
        />
      </RadioGroup>
    </Modal>
  );
}
