"use client";

import { useMemo, useState } from "react";
import {
  Autocomplete,
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
import type { DocumentStatusKey, OrderLineItem, OrderRow, OrderStatusKey } from "@/features/order-management/types";

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

type EditOrderModalProps = {
  open: boolean;
  order: OrderRow | null;
  itemOptions: ItemOption[];
  supplierOptions: Option[];
  currencyOptions: Option[];
  statusOptions: StatusOption[];
  documentOptions: DocumentOption[];
  onClose: () => void;
  onSave: (order: OrderRow) => void;
  onDelete?: (order: OrderRow) => void;
};

const emptyErrors = {
  orderDate: "",
  deliveryDate: "",
  supplier: "",
  currency: "",
};
type ErrorKey = keyof typeof emptyErrors;

const amountFormatter = new Intl.NumberFormat("en-US");

const createEmptyItem = (id: number): LineItemForm => ({
  id,
  itemCode: "",
  itemName: "",
  unit: "",
  quantity: "",
  unitPrice: "",
});

export default function EditOrderModal({
  open,
  order,
  itemOptions,
  supplierOptions,
  currencyOptions,
  statusOptions,
  documentOptions,
  onClose,
  onSave,
  onDelete,
}: EditOrderModalProps) {
  const getInitialForm = (row: OrderRow | null) => ({
    orderDate: row?.orderDate ?? "",
    deliveryDate: row?.deliveryDate ?? "",
    supplier: row?.supplier ?? "",
    currency: row?.currency ?? "",
    note: row?.note ?? "",
    status: row?.status ?? {
      ordered: true,
      delivered: false,
      paid: false,
    },
    documentStatus: row?.documentStatus ?? {
      orderSent: false,
      deliveryReceived: false,
      invoiceReceived: false,
    },
    items:
      row?.items.map((item) => ({
        id: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        unit: item.unit,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
      })) ?? [],
  });

  const [form, setForm] = useState(() => getInitialForm(order));
  const [errors, setErrors] = useState(emptyErrors);
  const [lineErrors, setLineErrors] = useState<Record<number, LineItemError>>({});
  const [itemsError, setItemsError] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const handleClose = () => {
    setActionError(null);
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

  const handleLineChange = (id: number, key: "quantity" | "unitPrice", value: string) => {
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
    const nextErrors = {
      orderDate: form.orderDate ? "" : "必須項目です",
      deliveryDate: form.deliveryDate ? "" : "必須項目です",
      supplier: form.supplier ? "" : "必須項目です",
      currency: form.currency ? "" : "必須項目です",
    };
    setErrors(nextErrors);

    if (!form.items.length) {
      setItemsError("部品明細を追加してください");
    }

    const nextLineErrors: Record<number, LineItemError> = {};
    form.items.forEach((item) => {
      const itemError: LineItemError = {};
      if (!item.itemCode) {
        itemError.itemCode = "必須項目です";
      }
      if (!item.quantity) {
        itemError.quantity = "必須項目です";
      }
      if (!item.unitPrice) {
        itemError.unitPrice = "必須項目です";
      }
      if (Object.keys(itemError).length) {
        nextLineErrors[item.id] = itemError;
      }
    });
    setLineErrors(nextLineErrors);

    const hasRequiredErrors =
      Object.values(nextErrors).some((message) => message) ||
      !form.items.length ||
      Object.keys(nextLineErrors).length;
    if (hasRequiredErrors) {
      setActionError("必須項目が入力されていません");
      return;
    }

    if (!order) {
      return;
    }

    const numericErrors: Record<number, LineItemError> = {};
    const parsedItems: OrderLineItem[] = [];
    form.items.forEach((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const itemError: LineItemError = {};
      if (Number.isNaN(quantity)) {
        itemError.quantity = "数値で入力してください";
      }
      if (Number.isNaN(unitPrice)) {
        itemError.unitPrice = "数値で入力してください";
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

    if (Object.keys(numericErrors).length) {
      setLineErrors((prev) => ({ ...prev, ...numericErrors }));
      return;
    }

    const totalAmount = parsedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    onSave({
      ...order,
      orderDate: form.orderDate,
      deliveryDate: form.deliveryDate,
      supplier: form.supplier,
      items: parsedItems,
      currency: form.currency,
      amount: totalAmount,
      note: form.note,
      status: form.status,
      documentStatus: form.documentStatus,
    });
  };

  return (
    <Modal
      open={open}
      title="編集"
      onClose={handleClose}
      actions={
        <div className="flex w-full items-center gap-2">
          <Button variant="outlined" color="error" onClick={() => order && onDelete?.(order)} disabled={!order}>
            削除
          </Button>
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            発注日 <span className="text-red-500">*</span>
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
            納品予定日 <span className="text-red-500">*</span>
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
          仕入先 <span className="text-red-500">*</span>
        </label>
        <Select
          size="small"
          value={form.supplier}
          onChange={(event) => handleChange("supplier", event.target.value)}
          displayEmpty
          error={Boolean(errors.supplier)}
          renderValue={(selected) => {
            if (!selected) {
              return <span className="text-gray-400">選択してください</span>;
            }
            const option = supplierOptions.find((item) => item.value === selected);
            return option?.label ?? selected;
          }}
        >
          {supplierOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">
          通貨 <span className="text-red-500">*</span>
        </label>
        <Autocomplete
          freeSolo
          options={currencyOptions.map((option) => option.label)}
          value={form.currency}
          inputValue={form.currency}
          onChange={(_, newValue) => handleChange("currency", newValue ?? "")}
          onInputChange={(_, newValue) => handleChange("currency", newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder="選択または入力"
              error={Boolean(errors.currency)}
              helperText={errors.currency}
            />
          )}
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">
          部品明細 <span className="text-red-500">*</span>
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
                      品目/品番 <span className="text-red-500">*</span>
                      {showCurrencyMismatch && (
                        <span className="text-xs font-normal text-amber-600">
                          マスターデータの通貨と一致していません。登録通貨: {selectedOption?.currency}
                        </span>
                      )}
                    </label>
                    <FormControl size="small" error={Boolean(itemError?.itemCode)}>
                      <Select
                        value={item.itemCode}
                        onChange={(event) => handleItemSelect(item.id, event.target.value)}
                        displayEmpty
                        renderValue={(selected) => {
                          if (!selected) {
                            return <span className="text-gray-400">品目を選択してください</span>;
                          }
                          const option = itemOptions.find((optionItem) => optionItem.value === selected);
                          return option?.label ?? selected;
                        }}
                      >
                        {rowItemOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {itemError?.itemCode ? <FormHelperText>{itemError.itemCode}</FormHelperText> : null}
                    </FormControl>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">
                        数量 <span className="text-red-500">*</span>
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
                        単価 <span className="text-red-500">*</span>
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
          {statusOptions.map((option) => (
            <FormControlLabel
              key={option.value}
              control={<Checkbox checked={form.status[option.value]} onChange={() => toggleStatus(option.value)} />}
              label={option.label}
              className="h-8"
            />
          ))}
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
