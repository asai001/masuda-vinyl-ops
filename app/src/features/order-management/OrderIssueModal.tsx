"use client";

import { useMemo } from "react";
import { Button } from "@mui/material";
import Modal from "@/components/Modal";
import { clientRows } from "@/mock/clientMasterData";
import { OrderRow } from "@/mock/orderManagementData";

type OrderIssueModalProps = {
  open: boolean;
  order: OrderRow | null;
  onClose: () => void;
};

const amountFormatter = new Intl.NumberFormat("en-US");
const vndExchangeRates = {
  VND: 1,
  USD: 25000,
  JPY: 170,
} as const;
const issuerInfo = {
  name: "MASUDA VINYL VIETNAM",
  addressLines: ["Lô 1 Đông vàng, Khu công nghiệp Đình Trám", "Phường Nếnh, Tỉnh Bắc Ninh"],
  phone: "0240-3662-7777",
} as const;

export default function OrderIssueModal({ open, order, onClose }: OrderIssueModalProps) {
  const issueDate = order?.orderDate ?? "-";
  const orderNumber = order ? `PO-${String(order.id).padStart(4, "0")}` : "-";
  const supplierInfo = useMemo(() => {
    if (!order) {
      return null;
    }
    return clientRows.find((row) => row.name === order.supplier) ?? null;
  }, [order]);
  const supplierAddress = supplierInfo?.address || "（未設定）";
  const supplierPhone = supplierInfo?.phone || "（未設定）";
  const [supplierAddressLine1, supplierAddressLine2] = useMemo(() => {
    if (supplierAddress === "（未設定）") {
      return [supplierAddress, ""];
    }
    const parts = supplierAddress.split(",").map((value) => value.trim());
    const line1 = parts[0] || supplierAddress;
    const line2 = parts.slice(1).join(", ").trim();
    return [line1, line2];
  }, [supplierAddress]);
  const vndRate = useMemo(() => {
    if (!order) {
      return vndExchangeRates.VND;
    }
    return vndExchangeRates[order.currency as keyof typeof vndExchangeRates] ?? vndExchangeRates.VND;
  }, [order]);
  const amountLabel = useMemo(() => {
    if (!order) {
      return "-";
    }
    const totalAmount = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * vndRate;
    return amountFormatter.format(totalAmount);
  }, [order, vndRate]);
  const lineItems = useMemo(() => {
    if (!order) {
      return [];
    }
    return order.items.map((item) => ({
      name: item.itemName,
      unit: item.unit || "-",
      quantity: amountFormatter.format(item.quantity),
      unitPrice: amountFormatter.format(item.unitPrice * vndRate),
      deliveryDate: order.deliveryDate,
      amount: amountFormatter.format(item.quantity * item.unitPrice * vndRate),
    }));
  }, [order, vndRate]);
  const totalRows = 9;
  const rows = Array.from({ length: totalRows }, (_, index) => lineItems[index] ?? null);

  return (
    <Modal
      open={open}
      title="注文書の発行"
      onClose={onClose}
      actions={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outlined" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="contained">発行</Button>
        </div>
      }
    >
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="text-sm font-semibold text-gray-700">プレビュー</div>
        {/* 印刷イメージに合わせた帳票レイアウト */}
        <div className="mt-4 flex justify-center">
          <div className="w-full max-w-[720px]">
            <div className="relative w-full aspect-[210/297] rounded-lg border border-gray-500 bg-white">
              <div className="absolute inset-0 overflow-y-auto p-4 text-[10px] text-gray-900">
                <div className="grid grid-cols-[1fr_auto_1fr] items-start font-serif">
                  <div />
                  <div className="text-center">
                    <div className="text-[17px] font-bold">注文書</div>
                    <div className="text-[13px] tracking-widest">ĐƠN ĐẶT HÀNG</div>
                  </div>
                  <div className="space-y-1 text-right text-[10px] leading-4">
                    <div className="font-semibold">注番: {orderNumber}</div>
                    <div>Mã đặt hàng:</div>
                    <div>{issueDate}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-[1.3fr_1fr] gap-4 font-serif">
                  <div className="space-y-1">
                    <div className="font-semibold">
                      <span className="border-gray-700 pb-0.5">{order?.supplier ?? "取引先名"}</span> 御中
                    </div>
                    <div className="h-2.5 pb-0.5 leading-4">Add: {supplierAddressLine1}</div>
                    <div className="h-2.5 pb-0.5 leading-4">{supplierAddressLine2}</div>
                    <div className="h-2.5 pb-0.5 leading-4">Tel : {supplierPhone}</div>
                  </div>
                  <div className="space-y-1 text-right leading-4">
                    <div className="h-2.5 font-semibold">{issuerInfo.name}</div>
                    {issuerInfo.addressLines.map((line) => (
                      <div className="h-2.5" key={line}>
                        {line}
                      </div>
                    ))}
                    <div>TELL: {issuerInfo.phone}</div>
                  </div>
                </div>

                <div className="mt-3 font-serif text-[12px]">下記の事項に注文致します。宜しくお願いします。</div>
                <div className="font-serif text-[10px]">Chúng tôi xác nhận đặt hàng theo danh mục các mặt hàng bên dưới.</div>

                <table className="mt-3 w-full border-collapse text-[9px]">
                  <thead>
                    <tr className="h-6">
                      <th className="border border-gray-700 px-2 align-middle">No.</th>
                      <th className="border border-gray-700 px-2 align-middle">
                        <div>品名/規格</div>
                        <div>Tên sản phẩm/Quy cách</div>
                      </th>
                      <th className="border border-gray-700 px-2 align-middle">
                        <div>単位</div>
                        <div>Đơn vị</div>
                      </th>
                      <th className="border border-gray-700 px-2 align-middle">
                        <div>数量</div>
                        <div>Số lượng</div>
                      </th>
                      <th className="border border-gray-700 px-2 align-middle">
                        <div>単価</div>
                        <div>Đơn giá</div>
                      </th>
                      <th className="border border-gray-700 px-2 align-middle">
                        <div>希望納期</div>
                        <div>Ngày giao</div>
                      </th>
                      <th className="border border-gray-700 px-2 align-middle">
                        <div>金額</div>
                        <div>Số tiền (VND)</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index} className="h-6">
                        <td className="border border-gray-700 px-2 text-center align-middle">{row ? index + 1 : ""}</td>
                        <td className="border border-gray-700 px-2 align-middle">{row?.name ?? ""}</td>
                        <td className="border border-gray-700 px-2 text-center align-middle">{row?.unit ?? ""}</td>
                        <td className="border border-gray-700 px-2 text-right align-middle">{row?.quantity ?? ""}</td>
                        <td className="border border-gray-700 px-2 text-right align-middle">{row?.unitPrice ?? ""}</td>
                        <td className="border border-gray-700 px-2 text-center align-middle">{row?.deliveryDate ?? ""}</td>
                        <td className="border border-gray-700 px-2 text-right align-middle">{row?.amount ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="h-8">
                      <td colSpan={6} className="border border-gray-700 px-2 py-2 text-right align-middle">
                        小計(税抜)
                      </td>
                      <td className="border border-gray-700 px-2 py-2 text-right align-middle">{amountLabel}</td>
                    </tr>
                    <tr className="h-8">
                      <td colSpan={6} className="border border-gray-700 px-2 py-2 text-right align-middle">
                        VAT %
                      </td>
                      <td className="border border-gray-700 px-2 py-2 text-right align-middle">-</td>
                    </tr>
                    <tr className="h-8">
                      <td colSpan={6} className="border border-gray-700 px-2 py-2 text-right font-semibold align-middle">
                        合計(税込)
                      </td>
                      <td className="border border-gray-700 px-2 py-2 text-right font-semibold align-middle">{amountLabel}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="mt-3 text-[9px]">摘要: {order?.note || "（未設定）"}</div>

                <div className="mt-6 flex justify-end">
                  <div className="flex h-[88px] w-[152px] items-center justify-center border border-gray-700 text-[11px] text-gray-600">
                    承認印
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
