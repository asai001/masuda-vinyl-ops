"use client";

import { useMemo, useRef, useState } from "react";
import { Button, FormControl, MenuItem, Select, TextField } from "@mui/material";
import { Plus, Save, Trash2 } from "lucide-react";
import Modal from "@/components/Modal";
import SearchableSelect from "@/components/SearchableSelect";
import type { SalesRow } from "@/features/sales-management/types";
import { buildShipmentCandidateLines } from "@/features/shipment-management/shipmentUtils";
import type {
  NewShipmentInput,
  ShipmentCandidateLine,
  ShipmentRow,
  UpdateShipmentInput,
} from "@/features/shipment-management/types";
import { useLanguage } from "@/lib/i18n/language";

type ShipmentFormModalProps = {
  open: boolean;
  shipment: ShipmentRow | null;
  salesRows: SalesRow[];
  onClose: () => void;
  onSave: (input: NewShipmentInput | UpdateShipmentInput) => Promise<boolean> | boolean | void;
  onDelete?: (shipment: ShipmentRow) => void;
  onIssue?: (shipment: ShipmentRow) => void;
  isIssuing?: boolean;
};

type ShipmentTargetOrderSelection = {
  id: string;
  salesOrderId: string;
};

type ShipmentCandidateOrder = {
  salesOrderId: string;
  orderNo: string;
  customerName: string;
  customerRegion: string;
  currency: string;
  lines: ShipmentCandidateLine[];
};

type ShipmentFormState = {
  deliveryDate: string;
  paidDate: string;
  paidAmount: string;
  note: string;
  customerName: string;
  currency: string;
  targetOrders: ShipmentTargetOrderSelection[];
  allocations: Record<string, string>;
};

type FormErrors = {
  deliveryDate?: string;
  paidDate?: string;
  paidAmount?: string;
  targetOrders?: string;
  allocations?: string;
  targetOrderMap: Record<string, string>;
  allocationMap: Record<string, string>;
  actionError?: string;
};

const amountFormatter = new Intl.NumberFormat("en-US");

const formatCurrencyValue = (currency: string, value: number) => {
  const normalizedCurrency = currency?.toUpperCase();
  if (!normalizedCurrency) {
    return amountFormatter.format(value);
  }
  return `${normalizedCurrency} ${amountFormatter.format(value)}`;
};

const buildAllocationKey = (salesOrderId: string, lineItemId: number) => `${salesOrderId}:${lineItemId}`;

const createTargetOrderId = (index: number) => `target-order-${index}`;

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildInitialTargetOrders = (shipment: ShipmentRow | null): ShipmentTargetOrderSelection[] =>
  Array.from(
    new Set(
      (shipment?.allocations ?? [])
        .map((allocation) => allocation.salesOrderId)
        .filter((salesOrderId): salesOrderId is string => Boolean(salesOrderId)),
    ),
  ).map((salesOrderId, index) => ({
    id: createTargetOrderId(index + 1),
    salesOrderId,
  }));

const getInitialForm = (shipment: ShipmentRow | null): ShipmentFormState => ({
  deliveryDate: shipment?.deliveryDate ?? getTodayDateString(),
  paidDate: shipment?.paidDate ?? "",
  paidAmount: shipment ? String(shipment.paidAmount ?? 0) : "0",
  note: shipment?.note ?? "",
  customerName: shipment?.customerName ?? "",
  currency: shipment?.currency ?? "",
  targetOrders: buildInitialTargetOrders(shipment),
  allocations: Object.fromEntries(
    (shipment?.allocations ?? []).map((allocation) => [
      buildAllocationKey(allocation.salesOrderId, allocation.lineItemId),
      String(allocation.shippedQuantity),
    ]),
  ),
});

const emptyErrors = (): FormErrors => ({
  targetOrderMap: {},
  allocationMap: {},
});

const buildCandidateOrders = (lines: ShipmentCandidateLine[]): ShipmentCandidateOrder[] => {
  const grouped = new Map<string, ShipmentCandidateOrder>();

  lines.forEach((line) => {
    const existing = grouped.get(line.salesOrderId);
    if (existing) {
      existing.lines.push(line);
      return;
    }

    grouped.set(line.salesOrderId, {
      salesOrderId: line.salesOrderId,
      orderNo: line.orderNo,
      customerName: line.customerName,
      customerRegion: line.customerRegion,
      currency: line.currency,
      lines: [line],
    });
  });

  return Array.from(grouped.values())
    .map((order) => ({
      ...order,
      lines: [...order.lines].sort((left, right) => left.lineItemId - right.lineItemId),
    }))
    .sort((left, right) => left.orderNo.localeCompare(right.orderNo, "ja"));
};

const getCurrencyOptions = (orders: ShipmentCandidateOrder[], customerName: string) =>
  Array.from(
    new Set(
      orders.filter((order) => !customerName || order.customerName === customerName).map((order) => order.currency),
    ),
  ).filter(Boolean);

const normalizeCurrencySelection = (
  orders: ShipmentCandidateOrder[],
  customerName: string,
  requestedCurrency: string,
) => {
  const options = getCurrencyOptions(orders, customerName);
  if (requestedCurrency && options.includes(requestedCurrency)) {
    return requestedCurrency;
  }
  if (options.length === 1) {
    return options[0];
  }
  return "";
};

export default function ShipmentFormModal({
  open,
  shipment,
  salesRows,
  onClose,
  onSave,
  onDelete,
  onIssue,
  isIssuing = false,
}: ShipmentFormModalProps) {
  const { language } = useLanguage();
  const tr = (ja: string, vi: string) => (language === "vi" ? vi : ja);
  const initialForm = useMemo(() => getInitialForm(shipment), [shipment]);
  const [form, setForm] = useState<ShipmentFormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>(emptyErrors);
  const nextTargetOrderIndexRef = useRef(initialForm.targetOrders.length + 1);

  const allCandidateLines = useMemo(() => buildShipmentCandidateLines(salesRows, shipment), [salesRows, shipment]);
  const candidateLineMap = useMemo(
    () => new Map(allCandidateLines.map((line) => [line.key, line])),
    [allCandidateLines],
  );
  const allCandidateOrders = useMemo(() => buildCandidateOrders(allCandidateLines), [allCandidateLines]);
  const candidateOrderMap = useMemo(
    () => new Map(allCandidateOrders.map((order) => [order.salesOrderId, order])),
    [allCandidateOrders],
  );

  const customerOptions = useMemo(
    () =>
      Array.from(new Set(allCandidateOrders.map((order) => order.customerName)))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "ja")),
    [allCandidateOrders],
  );

  const currencyOptions = useMemo(
    () => getCurrencyOptions(allCandidateOrders, form.customerName),
    [allCandidateOrders, form.customerName],
  );

  const visibleOrders = useMemo(() => {
    if (!form.customerName) {
      return [];
    }
    if (currencyOptions.length > 1 && !form.currency) {
      return [];
    }
    return allCandidateOrders.filter(
      (order) => order.customerName === form.customerName && (!form.currency || order.currency === form.currency),
    );
  }, [allCandidateOrders, currencyOptions.length, form.currency, form.customerName]);

  const selectedOrderIds = useMemo(
    () => form.targetOrders.map((selection) => selection.salesOrderId).filter(Boolean),
    [form.targetOrders],
  );

  const selectedOrderEntries = useMemo(
    () =>
      form.targetOrders.map((selection) => ({
        selection,
        order: selection.salesOrderId ? candidateOrderMap.get(selection.salesOrderId) ?? null : null,
      })),
    [candidateOrderMap, form.targetOrders],
  );

  const selectedLines = useMemo(
    () =>
      Object.entries(form.allocations).flatMap(([key, value]) => {
        const quantity = Number(value);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          return [];
        }
        const line = candidateLineMap.get(key);
        return line ? [{ line, quantity }] : [];
      }),
    [candidateLineMap, form.allocations],
  );

  const summary = useMemo(() => {
    const totalQuantity = selectedLines.reduce((sum, entry) => sum + entry.quantity, 0);
    const totalAmount = selectedLines.reduce((sum, entry) => sum + entry.quantity * entry.line.unitPrice, 0);
    const orderCount = new Set(selectedLines.map((entry) => entry.line.orderNo)).size;
    return {
      totalQuantity,
      totalAmount,
      lineCount: selectedLines.length,
      orderCount,
    };
  }, [selectedLines]);

  const canManageTargetOrders = Boolean(form.customerName) && (currencyOptions.length <= 1 || Boolean(form.currency));
  const hasPendingTargetOrder = form.targetOrders.some((selection) => !selection.salesOrderId);
  const remainingSelectableOrderCount = visibleOrders.filter(
    (order) => !selectedOrderIds.includes(order.salesOrderId),
  ).length;
  const canAddTargetOrder = canManageTargetOrders && !hasPendingTargetOrder && remainingSelectableOrderCount > 0;

  const pruneSelections = (nextCustomerName: string, nextCurrency: string) => {
    const normalizedCurrency = normalizeCurrencySelection(allCandidateOrders, nextCustomerName, nextCurrency);
    const allowedOrderIds = new Set(
      allCandidateOrders
        .filter(
          (order) =>
            (!nextCustomerName || order.customerName === nextCustomerName) &&
            (!normalizedCurrency || order.currency === normalizedCurrency),
        )
        .map((order) => order.salesOrderId),
    );

    setForm((prev) => ({
      ...prev,
      customerName: nextCustomerName,
      currency: normalizedCurrency,
      targetOrders: prev.targetOrders.filter(
        (selection) => !selection.salesOrderId || allowedOrderIds.has(selection.salesOrderId),
      ),
      allocations: Object.fromEntries(
        Object.entries(prev.allocations).filter(([key]) => {
          const line = candidateLineMap.get(key);
          return (
            line &&
            (!nextCustomerName || line.customerName === nextCustomerName) &&
            (!normalizedCurrency || line.currency === normalizedCurrency)
          );
        }),
      ),
    }));
    setErrors(emptyErrors());
  };

  const handleAddTargetOrder = () => {
    setForm((prev) => ({
      ...prev,
      targetOrders: [
        ...prev.targetOrders,
        {
          id: createTargetOrderId(nextTargetOrderIndexRef.current++),
          salesOrderId: "",
        },
      ],
    }));
    setErrors((prev) => ({
      ...prev,
      targetOrders: undefined,
    }));
  };

  const handleTargetOrderChange = (targetOrderId: string, nextSalesOrderId: string) => {
    setForm((prev) => {
      const currentSelection = prev.targetOrders.find((selection) => selection.id === targetOrderId);
      const currentSalesOrderId = currentSelection?.salesOrderId ?? "";
      const shouldPruneAllocations = currentSalesOrderId && currentSalesOrderId !== nextSalesOrderId;

      return {
        ...prev,
        targetOrders: prev.targetOrders.map((selection) =>
          selection.id === targetOrderId ? { ...selection, salesOrderId: nextSalesOrderId } : selection,
        ),
        allocations: shouldPruneAllocations
          ? Object.fromEntries(
              Object.entries(prev.allocations).filter(([key]) => {
                const line = candidateLineMap.get(key);
                return line && line.salesOrderId !== currentSalesOrderId;
              }),
            )
          : prev.allocations,
      };
    });
    setErrors(emptyErrors());
  };

  const handleRemoveTargetOrder = (targetOrderId: string) => {
    setForm((prev) => {
      const currentSelection = prev.targetOrders.find((selection) => selection.id === targetOrderId);
      const currentSalesOrderId = currentSelection?.salesOrderId ?? "";

      return {
        ...prev,
        targetOrders: prev.targetOrders.filter((selection) => selection.id !== targetOrderId),
        allocations: Object.fromEntries(
          Object.entries(prev.allocations).filter(([key]) => {
            const line = candidateLineMap.get(key);
            return line && line.salesOrderId !== currentSalesOrderId;
          }),
        ),
      };
    });
    setErrors(emptyErrors());
  };

  const getOrderOptionsForSelection = (selectionId: string) => {
    const currentSalesOrderId = form.targetOrders.find((selection) => selection.id === selectionId)?.salesOrderId ?? "";
    const selectedOtherIds = new Set(
      form.targetOrders
        .filter((selection) => selection.id !== selectionId)
        .map((selection) => selection.salesOrderId)
        .filter(Boolean),
    );

    return visibleOrders.filter(
      (order) => order.salesOrderId === currentSalesOrderId || !selectedOtherIds.has(order.salesOrderId),
    );
  };

  const handleQuantityChange = (line: ShipmentCandidateLine, value: string) => {
    if (value.trim().startsWith("-")) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      customerName: prev.customerName || line.customerName,
      currency: prev.currency || line.currency,
      allocations: {
        ...prev.allocations,
        [line.key]: value,
      },
    }));
    setErrors((prev) => ({
      ...prev,
      allocations: undefined,
      allocationMap: {
        ...prev.allocationMap,
        [line.key]: "",
      },
    }));
  };

  const buildPayload = (): { payload: NewShipmentInput | UpdateShipmentInput | null; previewRow: ShipmentRow | null } => {
    const nextErrors = emptyErrors();

    if (!form.deliveryDate) {
      nextErrors.deliveryDate = tr("出荷日を入力してください", "Vui lòng nhập ngày xuất hàng");
    }

    const paidAmount = Number(form.paidAmount);
    if (form.paidAmount.trim() && Number.isNaN(paidAmount)) {
      nextErrors.paidAmount = tr("数値で入力してください", "Vui lòng nhập bằng số");
    } else if (!Number.isNaN(paidAmount) && paidAmount < 0) {
      nextErrors.paidAmount = tr("0以上で入力してください", "Vui lòng nhập số từ 0 trở lên");
    } else if (paidAmount > 0 && !form.paidDate.trim()) {
      nextErrors.paidDate = tr("入金日を入力してください", "Vui lòng nhập ngày thu tiền");
    }

    if (!form.targetOrders.length) {
      nextErrors.targetOrders = tr("出荷対象受注を追加してください", "Vui lòng thêm đơn hàng xuất");
    }

    form.targetOrders.forEach((selection) => {
      if (!selection.salesOrderId) {
        nextErrors.targetOrderMap[selection.id] = tr("PO No. を選択してください", "Vui lòng chọn PO No.");
      }
    });

    const allocationLines = selectedOrderEntries.flatMap((entry) => entry.order?.lines ?? []);
    const allocations = allocationLines.flatMap((line, index) => {
      const rawValue = form.allocations[line.key] ?? "0";
      const quantity = rawValue.trim() ? Number(rawValue) : 0;
      if (!Number.isFinite(quantity) || quantity < 0) {
        nextErrors.allocationMap[line.key] = tr("0以上の数値で入力してください", "Vui lòng nhập số từ 0 trở lên");
        return [];
      }
      if (quantity > line.remainingQuantity) {
        nextErrors.allocationMap[line.key] = tr("残数を超えています", "Vượt quá số lượng còn lại");
        return [];
      }
      return [
        {
          id: index + 1,
          salesOrderId: line.salesOrderId,
          lineItemId: line.lineItemId,
          shippedQuantity: quantity,
        },
      ];
    });

    const hasErrors =
      Boolean(nextErrors.deliveryDate) ||
      Boolean(nextErrors.paidDate) ||
      Boolean(nextErrors.paidAmount) ||
      Boolean(nextErrors.targetOrders) ||
      Object.values(nextErrors.targetOrderMap).some(Boolean) ||
      Object.values(nextErrors.allocationMap).some(Boolean);

    if (hasErrors) {
      nextErrors.actionError = tr("入力内容を確認してください。", "Vui lòng kiểm tra lại nội dung đã nhập.");
      setErrors(nextErrors);
      return { payload: null, previewRow: null };
    }

    const primaryOrder =
      selectedOrderEntries.find((entry) => entry.order)?.order ?? candidateOrderMap.get(allocations[0]?.salesOrderId ?? "");

    const payloadBase = {
      deliveryDate: form.deliveryDate,
      paidDate: form.paidDate.trim(),
      paidAmount: Number.isFinite(paidAmount) ? paidAmount : 0,
      note: form.note,
      allocations,
    };

    const previewRow: ShipmentRow = {
      id: shipment?.id ?? 0,
      shipmentId: shipment?.shipmentId ?? "",
      shipmentNo: shipment?.shipmentNo ?? "",
      invoiceNo: shipment?.invoiceNo ?? "",
      deliveryDate: form.deliveryDate,
      paidDate: form.paidDate.trim(),
      paidAmount: Number.isFinite(paidAmount) ? paidAmount : 0,
      note: form.note,
      customerName: form.customerName || primaryOrder?.customerName || shipment?.customerName || "",
      customerRegion: primaryOrder?.customerRegion || shipment?.customerRegion || "",
      currency: form.currency || primaryOrder?.currency || shipment?.currency || "",
      allocations,
    };

    return {
      payload: shipment ? { shipmentId: shipment.shipmentId, ...payloadBase } : payloadBase,
      previewRow,
    };
  };

  const handleSave = async () => {
    const { payload } = buildPayload();
    if (!payload) {
      return;
    }
    const result = await Promise.resolve(onSave(payload));
    if (result === false) {
      return;
    }
    onClose();
  };

  const handleIssue = async () => {
    if (!shipment || !onIssue) {
      return;
    }
    const { payload, previewRow } = buildPayload();
    if (!payload || !previewRow) {
      return;
    }
    const result = await Promise.resolve(onSave(payload));
    if (result === false) {
      return;
    }
    onIssue({ ...shipment, ...previewRow });
    onClose();
  };

  return (
    <Modal
      open={open}
      title={
        shipment
          ? tr(`出荷編集（${shipment.shipmentNo}）`, `Chỉnh sửa xuất hàng (${shipment.shipmentNo})`)
          : tr("新規出荷", "Tạo xuất hàng")
      }
      onClose={onClose}
      paperSx={{
        width: { xs: "calc(100vw - 32px)", xl: 1100 },
        maxWidth: { xs: "calc(100vw - 32px)", xl: 1100 },
      }}
      actions={
        <div className="flex w-full items-center gap-2">
          {shipment ? (
            <Button variant="outlined" color="error" onClick={() => shipment && onDelete?.(shipment)}>
              {tr("削除", "Xóa")}
            </Button>
          ) : null}
          {errors.actionError ? <div className="text-xs text-red-600">{errors.actionError}</div> : null}
          <div className="ml-auto flex items-center gap-2">
            {shipment ? (
              <Button variant="outlined" onClick={handleIssue} disabled={isIssuing}>
                {tr("インボイス・パッキングリスト発行", "Phát hành Invoice / Packing List")}
              </Button>
            ) : null}
            <Button variant="outlined" onClick={onClose}>
              {tr("キャンセル", "Hủy")}
            </Button>
            <Button variant="contained" startIcon={<Save size={16} />} onClick={handleSave}>
              {tr("保存", "Lưu")}
            </Button>
          </div>
        </div>
      }
    >
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        {tr(
          "出荷対象受注を追加して PO No. を選択し、受注明細ごとに出荷数を入力してください。1出荷の中で選べる受注は、同じ顧客・同じ通貨に限定されます。",
          "Hãy thêm đơn hàng xuất, chọn PO No. và nhập số lượng xuất cho từng chi tiết đơn bán. Trong một phiếu xuất chỉ có thể chọn các đơn hàng cùng khách hàng và cùng tiền tệ.",
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">{tr("出荷日", "Ngày xuất hàng")}</label>
          <TextField
            size="small"
            type="date"
            value={form.deliveryDate}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, deliveryDate: event.target.value }));
              setErrors((prev) => ({ ...prev, deliveryDate: undefined }));
            }}
            error={Boolean(errors.deliveryDate)}
            helperText={errors.deliveryDate}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">{tr("入金日", "Ngày thu tiền")}</label>
          <TextField
            size="small"
            type="date"
            value={form.paidDate}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, paidDate: event.target.value }));
              setErrors((prev) => ({ ...prev, paidDate: undefined }));
            }}
            error={Boolean(errors.paidDate)}
            helperText={errors.paidDate}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">{tr("入金額", "Số tiền thu")}</label>
          <TextField
            size="small"
            type="number"
            value={form.paidAmount}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, paidAmount: event.target.value }));
              setErrors((prev) => ({ ...prev, paidAmount: undefined }));
            }}
            error={Boolean(errors.paidAmount)}
            helperText={errors.paidAmount}
            slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">{tr("顧客名", "Tên khách hàng")}</label>
          <SearchableSelect
            value={form.customerName}
            options={customerOptions.map((customerName) => ({ value: customerName, label: customerName }))}
            onChange={(value) => pruneSelections(value, "")}
            placeholder={tr("顧客名を選択してください", "Vui lòng chọn tên khách hàng")}
            noOptionsText={tr("候補がありません", "Không có lựa chọn")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">{tr("通貨", "Tiền tệ")}</label>
          <FormControl size="small" disabled={!form.customerName || currencyOptions.length <= 1}>
            <Select
              value={form.currency}
              onChange={(event) => pruneSelections(form.customerName, String(event.target.value))}
              displayEmpty
              renderValue={(selected) =>
                selected ? selected : <span className="text-gray-400">{tr("通貨を選択してください", "Vui lòng chọn tiền tệ")}</span>
              }
            >
              {currencyOptions.map((currency) => (
                <MenuItem key={currency} value={currency}>
                  {currency}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm font-semibold text-gray-700">{tr("出荷対象受注", "Đơn hàng xuất")}</label>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Plus size={16} />}
            onClick={handleAddTargetOrder}
            disabled={!canAddTargetOrder}
          >
            {tr("出荷対象受注を追加", "Thêm đơn hàng xuất")}
          </Button>
        </div>

        {errors.targetOrders ? <div className="text-sm text-red-600">{errors.targetOrders}</div> : null}
        {errors.allocations ? <div className="text-sm text-red-600">{errors.allocations}</div> : null}

        {!form.customerName ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
            {tr("先に顧客名を選択してください", "Vui lòng chọn tên khách hàng trước")}
          </div>
        ) : currencyOptions.length > 1 && !form.currency ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
            {tr("通貨を選択してください", "Vui lòng chọn tiền tệ")}
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
            {tr("出荷可能な受注はありません", "Không có đơn hàng có thể xuất")}
          </div>
        ) : form.targetOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
            {tr("「出荷対象受注を追加」から PO No. を選択してください", 'Hãy chọn PO No. từ "Thêm đơn hàng xuất"')}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {selectedOrderEntries.map(({ selection, order }, index) => {
              const orderOptions = getOrderOptionsForSelection(selection.id);

              return (
                <div key={selection.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-[260px] flex-1 flex-col gap-2">
                      <div className="text-xs font-semibold text-blue-700">{tr(`出荷対象受注 ${index + 1}`, `Đơn hàng xuất ${index + 1}`)}</div>
                      <SearchableSelect
                        value={selection.salesOrderId}
                        options={orderOptions.map((option) => ({
                          value: option.salesOrderId,
                          label: option.orderNo,
                        }))}
                        onChange={(value) => handleTargetOrderChange(selection.id, value)}
                        placeholder={tr("PO No. を選択してください", "Vui lòng chọn PO No.")}
                        noOptionsText={tr("候補がありません", "Không có lựa chọn")}
                        error={Boolean(errors.targetOrderMap[selection.id])}
                        helperText={errors.targetOrderMap[selection.id]}
                      />
                      {order ? (
                        <div className="text-xs text-gray-500">
                          {order.customerName} / {order.customerRegion || "-"} / {order.currency} /{" "}
                          {tr(`明細 ${order.lines.length} 件`, `Chi tiết ${order.lines.length} mục`)}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">{tr("出荷対象の PO No. を選択してください", "Vui lòng chọn PO No. để xuất hàng")}</div>
                      )}
                    </div>
                    <Button variant="outlined" color="inherit" startIcon={<Trash2 size={16} />} onClick={() => handleRemoveTargetOrder(selection.id)}>
                      {tr("受注を外す", "Bỏ đơn hàng")}
                    </Button>
                  </div>

                  {order ? (
                    <div className="mt-4 flex flex-col gap-3">
                      {order.lines.map((line) => {
                        const quantityValue = form.allocations[line.key] ?? (shipment ? "" : "0");
                        const quantity = Number(quantityValue);
                        const lineAmount = Number.isFinite(quantity) ? quantity * line.unitPrice : 0;
                        const isExhausted = line.remainingQuantity <= 0;

                        return (
                          <div
                            key={line.key}
                            className={`rounded-lg border p-4 ${isExhausted ? "border-gray-100 bg-gray-50" : "border-gray-200"}`}
                          >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_180px_180px] md:items-start">
                              <div className="flex flex-col gap-1">
                                <div className={`text-sm font-semibold ${isExhausted ? "text-gray-500" : "text-gray-800"}`}>
                                  {line.productCode} {line.productName}
                                </div>
                                <div className={`text-xs ${isExhausted ? "text-gray-400" : "text-gray-500"}`}>
                                  {tr(
                                    `受注数 ${amountFormatter.format(line.orderQuantity)} / 既出荷 ${amountFormatter.format(line.shippedQuantity)} / 残数 ${amountFormatter.format(line.remainingQuantity)}`,
                                    `Số lượng đặt ${amountFormatter.format(line.orderQuantity)} / Đã xuất ${amountFormatter.format(line.shippedQuantity)} / Còn lại ${amountFormatter.format(line.remainingQuantity)}`,
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                <label className={`text-sm font-semibold ${isExhausted ? "text-gray-500" : "text-gray-700"}`}>
                                  {tr("今回出荷数", "Số lượng xuất lần này")}
                                </label>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={quantityValue}
                                  onChange={(event) => handleQuantityChange(line, event.target.value)}
                                  disabled={isExhausted}
                                  error={Boolean(errors.allocationMap[line.key])}
                                  helperText={
                                    errors.allocationMap[line.key] ||
                                    (isExhausted
                                      ? tr("出荷済み", "Đã xuất hàng")
                                      : tr(
                                          `最大 ${amountFormatter.format(line.remainingQuantity)}`,
                                          `Tối đa ${amountFormatter.format(line.remainingQuantity)}`,
                                        ))
                                  }
                                  slotProps={{ htmlInput: { min: 0, max: line.remainingQuantity } }}
                                />
                              </div>
                              <div className="flex flex-col gap-2">
                                <label className={`text-sm font-semibold ${isExhausted ? "text-gray-500" : "text-gray-700"}`}>
                                  {tr("金額", "Số tiền")}
                                </label>
                                <div
                                  className={`flex h-10 items-center rounded-md border px-3 text-sm ${
                                    isExhausted
                                      ? "border-gray-100 bg-gray-100 text-gray-500"
                                      : "border-gray-200 bg-gray-50 text-gray-700"
                                  }`}
                                >
                                  {formatCurrencyValue(line.currency, lineAmount)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm md:grid-cols-4">
        <div>
          <div className="text-xs text-blue-700">{tr("対象PO数", "Số PO mục tiêu")}</div>
          <div className="font-semibold text-blue-900">{amountFormatter.format(summary.orderCount)}</div>
        </div>
        <div>
          <div className="text-xs text-blue-700">{tr("対象品目数", "Số mặt hàng mục tiêu")}</div>
          <div className="font-semibold text-blue-900">{amountFormatter.format(summary.lineCount)}</div>
        </div>
        <div>
          <div className="text-xs text-blue-700">{tr("出荷数合計", "Tổng số lượng xuất")}</div>
          <div className="font-semibold text-blue-900">{amountFormatter.format(summary.totalQuantity)}</div>
        </div>
        <div>
          <div className="text-xs text-blue-700">{tr("出荷金額", "Tổng tiền xuất hàng")}</div>
          <div className="font-semibold text-blue-900">{formatCurrencyValue(form.currency, summary.totalAmount)}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">{tr("備考", "Ghi chú")}</label>
        <TextField
          size="small"
          multiline
          minRows={3}
          value={form.note}
          onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
        />
      </div>
    </Modal>
  );
}
