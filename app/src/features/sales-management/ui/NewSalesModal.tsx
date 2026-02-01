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
import type {
  NewSalesOrderInput,
  SalesDocumentStatusKey,
  SalesLineItem,
  SalesStatusKey,
} from "@/features/sales-management/types";

type Option = {
  value: string;
  label: string;
};

type ProductOption = Option & {
  name: string;
  materials: string[];
  unitPrice: number;
  currency: string;
  weight: number | null;
  length: number | null;
  speed: number | null;
};

type CustomerOption = Option & {
  region: string;
  currency: string;
};

type StatusOption = {
  value: SalesStatusKey;
  label: string;
};

type DocumentOption = {
  value: SalesDocumentStatusKey;
  label: string;
};

type LineItemForm = {
  id: number;
  productCode: string;
  productName: string;
  materials: string[];
  orderQuantity: string;
  unitPrice: string;
  stockQuantity: string;
  shippedQuantity: string;
  weight: number | null;
  length: number | null;
  speed: number | null;
};

type LineItemError = {
  productCode?: string;
  orderQuantity?: string;
  unitPrice?: string;
  stockQuantity?: string;
  shippedQuantity?: string;
};

type NewSalesModalProps = {
  open: boolean;
  productOptions: ProductOption[];
  customerOptions: CustomerOption[];
  currencyOptions: Option[];
  statusOptions: StatusOption[];
  documentOptions: DocumentOption[];
  onClose: () => void;
  onSave: (order: NewSalesOrderInput) => void;
};

const emptyErrors = {
  orderNo: "",
  orderDate: "",
  deliveryDate: "",
  customerName: "",
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
  productCode: "",
  productName: "",
  materials: [],
  orderQuantity: "0",
  unitPrice: "0",
  stockQuantity: "0",
  shippedQuantity: "0",
  weight: null,
  length: null,
  speed: null,
});

export default function NewSalesModal({
  open,
  productOptions,
  customerOptions,
  currencyOptions,
  statusOptions,
  documentOptions,
  onClose,
  onSave,
}: NewSalesModalProps) {
  const [form, setForm] = useState({
    orderNo: "",
    orderDate: getTodayString(),
    deliveryDate: "",
    customerName: "",
    customerRegion: "",
    currency: "",
    note: "",
    status: {
      shipped: false,
      delivered: false,
      paid: false,
    },
    documentStatus: {
      orderReceived: false,
      deliverySent: false,
      invoiceSent: false,
    },
    items: [] as LineItemForm[],
  });
  const [errors, setErrors] = useState(emptyErrors);
  const [lineErrors, setLineErrors] = useState<Record<number, LineItemError>>({});
  const [itemsError, setItemsError] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const resetForm = () => {
    setForm({
      orderNo: "",
      orderDate: getTodayString(),
      deliveryDate: "",
      customerName: "",
      customerRegion: "",
      currency: "",
      note: "",
      status: {
        shipped: false,
        delivered: false,
        paid: false,
      },
      documentStatus: {
        orderReceived: false,
        deliverySent: false,
        invoiceSent: false,
      },
      items: [],
    });
    setErrors(emptyErrors);
    setLineErrors({});
    setItemsError("");
    setActionError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in emptyErrors) {
      setErrors((prev) => ({ ...prev, [key as ErrorKey]: "" }));
    }
  };

  const handleCustomerChange = (value: string) => {
    const selected = customerOptions.find((option) => option.value === value);
    setForm((prev) => ({
      ...prev,
      customerName: value,
      customerRegion: selected?.region ?? prev.customerRegion,
      currency: selected?.currency ?? prev.currency,
    }));
    setErrors((prev) => ({
      ...prev,
      customerName: "",
      currency: "",
    }));
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

  const handleLineChange = (
    id: number,
    key: "orderQuantity" | "unitPrice" | "stockQuantity" | "shippedQuantity",
    value: string
  ) => {
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

  const handleProductSelect = (id: number, value: string) => {
    const selected = productOptions.find((option) => option.value === value);
    setForm((prev) => ({
      ...prev,
      currency: selected?.currency && !prev.currency ? selected.currency : prev.currency,
      items: prev.items.map((item) =>
        item.id === id
          ? {
              ...item,
              productCode: value,
              productName: selected?.name ?? "",
              materials: selected?.materials ?? [],
              unitPrice: selected ? String(selected.unitPrice) : item.unitPrice,
              weight: selected?.weight ?? null,
              length: selected?.length ?? null,
              speed: selected?.speed ?? null,
            }
          : item
      ),
    }));
    setLineErrors((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        productCode: "",
        unitPrice: "",
      },
    }));
  };

  const toggleStatus = (key: SalesStatusKey) => {
    setForm((prev) => ({
      ...prev,
      status: { ...prev.status, [key]: !prev.status[key] },
    }));
  };

  const toggleDocumentStatus = (key: SalesDocumentStatusKey) => {
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
      const quantity = Number(item.orderQuantity);
      const unitPrice = Number(item.unitPrice);
      if (!item.orderQuantity || !item.unitPrice || Number.isNaN(quantity) || Number.isNaN(unitPrice)) {
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
      orderNo: form.orderNo ? "" : "必須項目です",
      orderDate: form.orderDate ? "" : "必須項目です",
      deliveryDate: form.deliveryDate ? "" : "必須項目です",
      customerName: form.customerName ? "" : "必須項目です",
      currency: form.currency ? "" : "必須項目です",
    };
    setErrors(nextErrors);

    if (!form.items.length) {
      setItemsError("製品明細を追加してください");
    }

    const nextLineErrors: Record<number, LineItemError> = {};
    form.items.forEach((item) => {
      const itemError: LineItemError = {};
      if (!item.productCode) {
        itemError.productCode = "必須項目です";
      }
      if (!item.orderQuantity) {
        itemError.orderQuantity = "必須項目です";
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
      setActionError("入力内容をご確認ください。");
      return;
    }

    const numericErrors: Record<number, LineItemError> = {};
    const parsedItems: SalesLineItem[] = [];
    form.items.forEach((item) => {
      const orderQuantity = Number(item.orderQuantity);
      const unitPrice = Number(item.unitPrice);
      const stockQuantity = Number(item.stockQuantity);
      const shippedQuantity = Number(item.shippedQuantity);
      const itemError: LineItemError = {};
      if (Number.isNaN(orderQuantity)) {
        itemError.orderQuantity = "数値で入力してください";
      }
      if (Number.isNaN(unitPrice)) {
        itemError.unitPrice = "数値で入力してください";
      }
      if (Number.isNaN(stockQuantity)) {
        itemError.stockQuantity = "数値で入力してください";
      }
      if (Number.isNaN(shippedQuantity)) {
        itemError.shippedQuantity = "数値で入力してください";
      }
      if (!itemError.orderQuantity && orderQuantity < 0) {
        itemError.orderQuantity = "0以上で入力してください";
      }
      if (!itemError.unitPrice && unitPrice < 0) {
        itemError.unitPrice = "0以上で入力してください";
      }
      if (!itemError.stockQuantity && stockQuantity < 0) {
        itemError.stockQuantity = "0以上で入力してください";
      }
      if (!itemError.shippedQuantity && shippedQuantity < 0) {
        itemError.shippedQuantity = "0以上で入力してください";
      }
      if (Object.keys(itemError).length) {
        numericErrors[item.id] = itemError;
        return;
      }
      parsedItems.push({
        id: item.id,
        productCode: item.productCode,
        productName: item.productName,
        materials: item.materials,
        stockQuantity,
        orderQuantity,
        shippedQuantity,
        unitPrice,
        weight: item.weight,
        length: item.length,
        speed: item.speed,
      });
    });

    if (Object.keys(numericErrors).length) {
      setLineErrors((prev) => ({ ...prev, ...numericErrors }));
      return;
    }

    onSave({
      orderNo: form.orderNo,
      orderDate: form.orderDate,
      customerName: form.customerName,
      customerRegion: form.customerRegion,
      deliveryDate: form.deliveryDate,
      currency: form.currency,
      note: form.note,
      items: parsedItems,
      status: form.status,
      documentStatus: form.documentStatus,
    });
    resetForm();
  };

  return (
    <Modal
      open={open}
      title="新規受注"
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
        <label className="text-sm font-semibold text-gray-700">
          PO No. <span className="text-red-500">*</span>
        </label>
        <TextField
          size="small"
          placeholder="PO-2025-001"
          value={form.orderNo}
          onChange={(event) => handleChange("orderNo", event.target.value)}
          error={Boolean(errors.orderNo)}
          helperText={errors.orderNo}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            受注日 <span className="text-red-500">*</span>
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
          顧客名 <span className="text-red-500">*</span>
        </label>
        <FormControl size="small" error={Boolean(errors.customerName)}>
          <Select
            value={form.customerName}
            onChange={(event) => handleCustomerChange(event.target.value)}
            displayEmpty
            renderValue={(selected) => {
              if (!selected) {
                return <span className="text-gray-400">選択してください</span>;
              }
              const option = customerOptions.find((item) => item.value === selected);
              return option?.label ?? selected;
            }}
          >
            {customerOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{errors.customerName}</FormHelperText>
        </FormControl>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">
          通貨 <span className="text-red-500">*</span>
        </label>
        <FormControl size="small" error={Boolean(errors.currency)}>
          <Select
            value={form.currency}
            onChange={(event) => handleChange("currency", event.target.value)}
            displayEmpty
            renderValue={(selected) => {
              if (!selected) {
                return <span className="text-gray-400">選択してください</span>;
              }
              const option = currencyOptions.find((item) => item.value === selected);
              return option?.label ?? selected;
            }}
          >
            {currencyOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {errors.currency ? <FormHelperText>{errors.currency}</FormHelperText> : null}
        </FormControl>
      </div>

      <Divider />

      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">
          製品明細 <span className="text-red-500">*</span>
        </label>
        <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={handleAddItem}>
          製品を追加
        </Button>
      </div>
      {itemsError ? <div className="text-sm text-red-500">{itemsError}</div> : null}

      {form.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
          製品明細を追加してください
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {form.items.map((item, index) => {
            const itemError = lineErrors[item.id];
            const selectedOption = productOptions.find((option) => option.value === item.productCode);
            const showCurrencyMismatch =
              Boolean(item.productCode) &&
              Boolean(form.currency) &&
              Boolean(selectedOption?.currency) &&
              selectedOption?.currency !== form.currency;
            return (
              <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-700">製品 #{index + 1}</div>
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
                    <FormControl size="small" error={Boolean(itemError?.productCode)}>
                      <Select
                        value={item.productCode}
                        onChange={(event) => handleProductSelect(item.id, event.target.value)}
                        displayEmpty
                        renderValue={(selected) => {
                          if (!selected) {
                            return <span className="text-gray-400">製品を選択してください</span>;
                          }
                          const option = productOptions.find((optionItem) => optionItem.value === selected);
                          return option?.label ?? selected;
                        }}
                      >
                        {productOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {itemError?.productCode ? <FormHelperText>{itemError.productCode}</FormHelperText> : null}
                    </FormControl>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">
                        注数 <span className="text-red-500">*</span>
                      </label>
                      <TextField
                        size="small"
                        type="number"
                        value={item.orderQuantity}
                        onChange={(event) => handleLineChange(item.id, "orderQuantity", event.target.value)}
                        error={Boolean(itemError?.orderQuantity)}
                        helperText={itemError?.orderQuantity}
                        slotProps={{ htmlInput: { min: 0 } }}
                      />
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
                        slotProps={{ htmlInput: { min: 0, step: "0.1" } }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">在庫数</label>
                      <TextField
                        size="small"
                        type="number"
                        value={item.stockQuantity}
                        onChange={(event) => handleLineChange(item.id, "stockQuantity", event.target.value)}
                        error={Boolean(itemError?.stockQuantity)}
                        helperText={itemError?.stockQuantity}
                        slotProps={{ htmlInput: { min: 0 } }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">出荷数</label>
                      <TextField
                        size="small"
                        type="number"
                        value={item.shippedQuantity}
                        onChange={(event) => handleLineChange(item.id, "shippedQuantity", event.target.value)}
                        error={Boolean(itemError?.shippedQuantity)}
                        helperText={itemError?.shippedQuantity}
                        slotProps={{ htmlInput: { min: 0 } }}
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
        <label className="text-sm font-semibold text-gray-700">請求状況</label>
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
