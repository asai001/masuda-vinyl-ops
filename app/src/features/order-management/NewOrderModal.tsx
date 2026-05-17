"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { Plus, Save } from "lucide-react";
import Modal from "@/components/Modal";
import SearchableSelect from "@/components/SearchableSelect";
import type {
  DocumentStatusKey,
  NewPurchaseOrderInput,
  OrderLineItem,
  OrderPayment,
  OrderStatusKey,
} from "@/features/order-management/types";
import { CURRENCY_OPTIONS } from "@/constants/currency";

type Option = {
  value: string;
  label: string;
};

type ItemOption = Option & {
  name: string;
  supplier: string;
  unit: string;
  unitPrice: number;
  currency: string;
};

type StatusOption = {
  value: OrderStatusKey;
  label: string;
};

type DocumentOption = {
  value: DocumentStatusKey;
  label: string;
};

type LineItemForm = {
  id: number;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: string;
  unitPrice: string;
};

type LineItemError = {
  itemCode?: string;
  quantity?: string;
  unitPrice?: string;
};

type PaymentForm = {
  id: number;
  paymentDate: string;
  amount: string;
  note: string;
};

type PaymentError = {
  paymentDate?: string;
  amount?: string;
};

type NewOrderModalProps = {
  open: boolean;
  itemOptions: ItemOption[];
  supplierOptions: Option[];
  statusOptions: StatusOption[];
  documentOptions: DocumentOption[];
  onClose: () => void;
  onSave: (order: NewPurchaseOrderInput) => void;
};

const emptyErrors = {
  orderDate: "",
  deliveryDate: "",
  supplier: "",
  currency: "",
};
type ErrorKey = keyof typeof emptyErrors;

const amountFormatter = new Intl.NumberFormat("en-US");

const getTodayString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createEmptyItem = (id: number): LineItemForm => ({
  id,
  itemCode: "",
  itemName: "",
  unit: "",
  quantity: "",
  unitPrice: "",
});

const createEmptyPayment = (id: number): PaymentForm => ({
  id,
  paymentDate: "",
  amount: "",
  note: "",
});

export default function NewOrderModal({
  open,
  itemOptions,
  supplierOptions,
  statusOptions,
  documentOptions,
  onClose,
  onSave,
}: NewOrderModalProps) {
  const [form, setForm] = useState({
    poNo: "",
    orderDate: getTodayString(),
    deliveryDate: "",
    supplier: "",
    currency: "",
    note: "",
    status: {
      ordered: true,
      delivered: false,
      paid: false,
    },
    documentStatus: {
      orderSent: false,
      deliveryReceived: false,
      invoiceReceived: false,
    },
    items: [] as LineItemForm[],
    payments: [] as PaymentForm[],
  });
  const [errors, setErrors] = useState(emptyErrors);
  const [lineErrors, setLineErrors] = useState<Record<number, LineItemError>>({});
  const [paymentErrors, setPaymentErrors] = useState<Record<number, PaymentError>>({});
  const [itemsError, setItemsError] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const resetForm = () => {
    setForm({
      poNo: "",
      orderDate: getTodayString(),
      deliveryDate: "",
      supplier: "",
      currency: "",
      note: "",
      status: {
        ordered: true,
        delivered: false,
        paid: false,
      },
      documentStatus: {
        orderSent: false,
        deliveryReceived: false,
        invoiceReceived: false,
      },
      items: [],
      payments: [],
    });
    setErrors(emptyErrors);
    setLineErrors({});
    setPaymentErrors({});
    setItemsError("");
    setActionError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const sanitizeItemsForSupplier = (items: LineItemForm[], supplier: string) => {
    if (!supplier) {
      return { items, clearedIds: [] as number[] };
    }
    const allowedCodes = new Set(
      itemOptions.filter((option) => option.supplier === supplier).map((option) => option.value),
    );
    const clearedIds: number[] = [];
    const nextItems = items.map((item) => {
      if (item.itemCode && !allowedCodes.has(item.itemCode)) {
        clearedIds.push(item.id);
        return { ...item, itemCode: "", itemName: "", unit: "", unitPrice: "" };
      }
      return item;
    });
    return { items: nextItems, clearedIds };
  };

  const clearLineErrors = (clearedIds: number[]) => {
    if (!clearedIds.length) {
      return;
    }
    setLineErrors((prev) => {
      const next = { ...prev };
      clearedIds.forEach((id) => {
        if (!next[id]) {
          return;
        }
        next[id] = { ...next[id], itemCode: "", unitPrice: "" };
      });
      return next;
    });
  };

  const handleChange = (key: keyof typeof form, value: string) => {
    if (key === "supplier") {
      const { items: nextItems, clearedIds } = sanitizeItemsForSupplier(form.items, value);
      setForm((prev) => ({ ...prev, supplier: value, items: nextItems }));
      clearLineErrors(clearedIds);
    } else {
      setForm((prev) => ({ ...prev, [key]: value }));
    }
    if (key in emptyErrors) {
      setErrors((prev) => ({ ...prev, [key as ErrorKey]: "" }));
    }
  };

  const handleAddItem = () => {
    const nextId = form.items.length ? Math.max(...form.items.map((item) => item.id)) + 1 : 1;
    setForm((prev) => ({ ...prev, items: [...prev.items, createEmptyItem(nextId)] }));
    setItemsError("");
  };

  const handleRemoveItem = (id: number) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
    setLineErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleAddPayment = () => {
    const nextId = form.payments.length ? Math.max(...form.payments.map((payment) => payment.id)) + 1 : 1;
    setForm((prev) => ({ ...prev, payments: [...prev.payments, createEmptyPayment(nextId)] }));
  };

  const handleRemovePayment = (id: number) => {
    setForm((prev) => ({ ...prev, payments: prev.payments.filter((payment) => payment.id !== id) }));
    setPaymentErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handlePaymentChange = (id: number, key: keyof PaymentForm, value: string) => {
    if (key === "amount" && value.trim().startsWith("-")) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      payments: prev.payments.map((payment) =>
        payment.id === id ? { ...payment, [key]: value } : payment,
      ),
    }));
    setPaymentErrors((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: undefined },
    }));
  };

  const handleLineChange = (id: number, key: "quantity" | "unitPrice", value: string) => {
    if (value.trim().startsWith("-")) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }));
    setLineErrors((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: "" },
    }));
  };

  const handleItemSelect = (id: number, value: string) => {
    const selected = itemOptions.find((option) => option.value === value);
    const nextSupplier = selected?.supplier ?? form.supplier;
    const nextCurrency = selected?.currency ?? form.currency;
    const nextItems = form.items.map((item) =>
      item.id === id
        ? {
            ...item,
            itemCode: value,
            itemName: selected?.name ?? "",
            unit: selected?.unit ?? "",
            unitPrice: selected ? String(selected.unitPrice) : item.unitPrice,
          }
        : item,
    );
    const { items: sanitizedItems, clearedIds } = sanitizeItemsForSupplier(nextItems, nextSupplier);
    setForm((prev) => ({
      ...prev,
      supplier: nextSupplier,
      currency: nextCurrency,
      items: sanitizedItems,
    }));
    clearLineErrors(clearedIds);
    setErrors((prev) => ({
      ...prev,
      supplier: "",
      currency: "",
    }));
    setLineErrors((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        itemCode: "",
        unitPrice: "",
      },
    }));
  };

  const filteredItemOptions = useMemo(
    () => (form.supplier ? itemOptions.filter((option) => option.supplier === form.supplier) : itemOptions),
    [form.supplier, itemOptions],
  );


  const toggleStatus = (key: OrderStatusKey) => {
    setForm((prev) => ({
      ...prev,
      status: { ...prev.status, [key]: !prev.status[key] },
    }));
  };

  const toggleDocumentStatus = (key: DocumentStatusKey) => {
    setForm((prev) => ({
      ...prev,
      documentStatus: { ...prev.documentStatus, [key]: !prev.documentStatus[key] },
    }));
  };

  const amountValue = useMemo(() => {
    if (!form.items.length) {
      return null;
    }
    let hasValue = false;
    const total = form.items.reduce((sum, item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (!item.quantity || !item.unitPrice || Number.isNaN(quantity) || Number.isNaN(unitPrice)) {
        return sum;
      }
      hasValue = true;
      return sum + quantity * unitPrice;
    }, 0);
    return hasValue ? total : null;
  }, [form.items]);

  const amountLabel = useMemo(() => {
    if (amountValue === null || !form.currency) {
      return "-";
    }
    return `${form.currency} ${amountFormatter.format(amountValue)}`;
  }, [amountValue, form.currency]);

  const handleSave = () => {
    setActionError(null);
    setErrors(emptyErrors);
    setItemsError("");
    setLineErrors({});
    setPaymentErrors({});

    const numericErrors: Record<number, LineItemError> = {};
    const parsedItems: OrderLineItem[] = [];
    form.items.forEach((item) => {
      const hasInput = Boolean(
        item.itemCode || item.itemName || item.unit || item.quantity.trim() || item.unitPrice.trim()
      );
      if (!hasInput) {
        return;
      }

      const quantityValue = item.quantity.trim();
      const unitPriceValue = item.unitPrice.trim();
      const quantity = quantityValue ? Number(item.quantity) : 0;
      const unitPrice = unitPriceValue ? Number(item.unitPrice) : 0;
      const itemError: LineItemError = {};
      if (quantityValue && Number.isNaN(quantity)) {
        itemError.quantity = "数値で入力してください";
      }
      if (unitPriceValue && Number.isNaN(unitPrice)) {
        itemError.unitPrice = "数値で入力してください";
      }
      if (!itemError.quantity && quantityValue && quantity < 0) {
        itemError.quantity = "0以上で入力してください";
      }
      if (!itemError.unitPrice && unitPriceValue && unitPrice < 0) {
        itemError.unitPrice = "0以上で入力してください";
      }
      if (Object.keys(itemError).length) {
        numericErrors[item.id] = itemError;
        return;
      }
      parsedItems.push({
        id: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        unit: item.unit,
        quantity,
        unitPrice,
      });
    });

    const paymentValidationErrors: Record<number, PaymentError> = {};
    const parsedPayments: OrderPayment[] = [];
    form.payments.forEach((payment) => {
      const hasInput = Boolean(payment.paymentDate.trim() || payment.amount.trim() || payment.note.trim());
      if (!hasInput) {
        return;
      }
      const amountValue = payment.amount.trim();
      const amount = amountValue ? Number(payment.amount) : NaN;
      const error: PaymentError = {};
      if (!payment.paymentDate.trim()) {
        error.paymentDate = "支払日を入力してください";
      }
      if (!amountValue) {
        error.amount = "金額を入力してください";
      } else if (Number.isNaN(amount)) {
        error.amount = "数値で入力してください";
      } else if (amount <= 0) {
        error.amount = "0より大きい値を入力してください";
      }
      if (Object.keys(error).length) {
        paymentValidationErrors[payment.id] = error;
        return;
      }
      parsedPayments.push({
        id: payment.id,
        paymentDate: payment.paymentDate.trim(),
        amount,
        ...(payment.note.trim() ? { note: payment.note.trim() } : {}),
      });
    });

    if (Object.keys(numericErrors).length || Object.keys(paymentValidationErrors).length) {
      setLineErrors(numericErrors);
      setPaymentErrors(paymentValidationErrors);
      setActionError("入力内容をご確認ください。");
      return;
    }

    const totalAmount = parsedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    // 支払い履歴登録時は合計支払額>=発注額で支払済みフラグを自動制御する
    const totalPaid = parsedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const nextStatus =
      parsedPayments.length > 0 && totalAmount > 0
        ? { ...form.status, paid: totalPaid >= totalAmount }
        : form.status;

    onSave({
      poNo: form.poNo.trim(),
      orderDate: form.orderDate,
      deliveryDate: form.deliveryDate,
      supplier: form.supplier,
      items: parsedItems,
      currency: form.currency,
      amount: totalAmount,
      note: form.note,
      payments: parsedPayments,
      status: nextStatus,
      documentStatus: form.documentStatus,
    });
    resetForm();
  };

  return (
    <Modal
      open={open}
      title="新規発注"
      onClose={handleClose}
      actions={
        <div className="flex w-full items-center gap-2">
          {actionError ? <div className="text-xs text-red-600">{actionError}</div> : null}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outlined" onClick={handleClose}>
              キャンセル
            </Button>
            <Button variant="contained" startIcon={<Save size={16} />} onClick={handleSave}>
              保存
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">PO No.</label>
        <TextField
          size="small"
          value={form.poNo}
          onChange={(event) => handleChange("poNo", event.target.value)}
          placeholder="仕入先発行のPO番号を入力してください"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            発注日
          </label>
          <TextField
            size="small"
            type="date"
            value={form.orderDate}
            onChange={(event) => handleChange("orderDate", event.target.value)}
            error={Boolean(errors.orderDate)}
            helperText={errors.orderDate}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            納品予定日
          </label>
          <TextField
            size="small"
            type="date"
            value={form.deliveryDate}
            onChange={(event) => handleChange("deliveryDate", event.target.value)}
            error={Boolean(errors.deliveryDate)}
            helperText={errors.deliveryDate}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">
          仕入先
        </label>
        <SearchableSelect
          value={form.supplier}
          options={supplierOptions}
          onChange={(value) => handleChange("supplier", value)}
          placeholder="選択してください"
          error={Boolean(errors.supplier)}
          helperText={errors.supplier}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">
          通貨
        </label>
        <FormControl size="small" error={Boolean(errors.currency)}>
          <Select
            value={form.currency}
            onChange={(event) => handleChange("currency", event.target.value)}
            displayEmpty
            renderValue={(selected) => (selected ? selected : <span className="text-gray-400">選択してください</span>)}
          >
            {CURRENCY_OPTIONS.map((currency) => (
              <MenuItem key={currency} value={currency}>
                {currency}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{errors.currency}</FormHelperText>
        </FormControl>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">
          部品明細
        </label>
        <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={handleAddItem}>
          部品を追加
        </Button>
      </div>
      {itemsError ? <div className="text-sm text-red-500">{itemsError}</div> : null}

      {form.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
          部品明細を追加してください
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {form.items.map((item, index) => {
            const itemError = lineErrors[item.id];
            const selectedOption = itemOptions.find((option) => option.value === item.itemCode);
            const showCurrencyMismatch =
              Boolean(item.itemCode) &&
              Boolean(form.currency) &&
              Boolean(selectedOption?.currency) &&
              selectedOption?.currency !== form.currency;
            const selectedCodes = new Set(
              form.items
                .filter((line) => line.id !== item.id)
                .map((line) => line.itemCode)
                .filter(Boolean),
            );
            const rowItemOptions = filteredItemOptions.filter(
              (option) => option.value === item.itemCode || !selectedCodes.has(option.value),
            );
            return (
              <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-700">明細 #{index + 1}</div>
                  <Button variant="text" color="error" size="small" onClick={() => handleRemoveItem(item.id)}>
                    削除
                  </Button>
                </div>

                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      品目/品番
                      {showCurrencyMismatch && (
                        <span className="text-xs font-normal text-amber-600">
                          マスターデータの通貨と一致していません。登録通貨: {selectedOption?.currency}
                        </span>
                      )}
                    </label>
                    <SearchableSelect
                      value={item.itemCode}
                      options={rowItemOptions}
                      onChange={(value) => handleItemSelect(item.id, value)}
                      placeholder="品目を選択してください"
                      error={Boolean(itemError?.itemCode)}
                      helperText={itemError?.itemCode}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">
                        数量
                      </label>
                      <TextField
                        size="small"
                        type="number"
                        value={item.quantity}
                        onChange={(event) => handleLineChange(item.id, "quantity", event.target.value)}
                        error={Boolean(itemError?.quantity)}
                        helperText={itemError?.quantity}
                        slotProps={{ htmlInput: { min: 0 } }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">単位</label>
                      <TextField size="small" value={item.unit} placeholder="-" disabled />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">
                        単価
                      </label>
                      <TextField
                        size="small"
                        type="number"
                        value={item.unitPrice}
                        onChange={(event) => handleLineChange(item.id, "unitPrice", event.target.value)}
                        error={Boolean(itemError?.unitPrice)}
                        helperText={itemError?.unitPrice}
                        slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
        <span>合計金額</span>
        <span>{amountLabel}</span>
      </div>

      <Divider />

      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">支払い履歴</label>
        <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={handleAddPayment}>
          支払いを追加
        </Button>
      </div>
      {form.payments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
          支払いを登録すると、合計金額に達した時点で「支払い済み」が自動的にチェックされます。
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {form.payments.map((payment, index) => {
            const paymentError = paymentErrors[payment.id];
            return (
              <div key={payment.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-700">支払い #{index + 1}</div>
                  <Button variant="text" color="error" size="small" onClick={() => handleRemovePayment(payment.id)}>
                    削除
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">支払日</label>
                    <TextField
                      size="small"
                      type="date"
                      value={payment.paymentDate}
                      onChange={(event) => handlePaymentChange(payment.id, "paymentDate", event.target.value)}
                      error={Boolean(paymentError?.paymentDate)}
                      helperText={paymentError?.paymentDate}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-gray-700">支払金額</label>
                    <TextField
                      size="small"
                      type="number"
                      value={payment.amount}
                      onChange={(event) => handlePaymentChange(payment.id, "amount", event.target.value)}
                      error={Boolean(paymentError?.amount)}
                      helperText={paymentError?.amount}
                      slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700">備考</label>
                  <TextField
                    size="small"
                    value={payment.note}
                    onChange={(event) => handlePaymentChange(payment.id, "note", event.target.value)}
                    placeholder="備考を入力してください"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">備考</label>
        <TextField
          size="small"
          multiline
          minRows={3}
          placeholder="備考を入力してください"
          value={form.note}
          onChange={(event) => handleChange("note", event.target.value)}
        />
      </div>

      <Divider />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">ステータス</label>
        <FormGroup>
          {statusOptions.map((option) => {
            const isPaidKey = option.value === "paid";
            const hasPayments = form.payments.some(
              (payment) => payment.paymentDate.trim() || payment.amount.trim(),
            );
            const disabled = isPaidKey && hasPayments;
            const totalPaid = form.payments.reduce((sum, payment) => {
              const amount = Number(payment.amount);
              return Number.isFinite(amount) ? sum + amount : sum;
            }, 0);
            const derivedPaid =
              isPaidKey && hasPayments && amountValue !== null && amountValue > 0
                ? totalPaid >= amountValue
                : form.status[option.value];
            return (
              <FormControlLabel
                key={option.value}
                control={
                  <Checkbox
                    checked={derivedPaid}
                    onChange={() => toggleStatus(option.value)}
                    disabled={disabled}
                  />
                }
                label={
                  disabled ? `${option.label}（支払い履歴から自動制御）` : option.label
                }
                className="h-8"
              />
            );
          })}
        </FormGroup>
      </div>

      <Divider />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">書類状況</label>
        <FormGroup>
          {documentOptions.map((option) => (
            <FormControlLabel
              key={option.value}
              control={
                <Checkbox
                  checked={form.documentStatus[option.value]}
                  onChange={() => toggleDocumentStatus(option.value)}
                />
              }
              label={option.label}
              className="h-8"
            />
          ))}
        </FormGroup>
      </div>
    </Modal>
  );
}
