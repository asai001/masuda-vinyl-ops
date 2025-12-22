"use client";

import { useMemo, useState } from "react";
import {
  Autocomplete,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { Save } from "lucide-react";
import Modal from "@/components/Modal";
import { DocumentStatusKey, OrderRow, OrderStatusKey } from "@/mock/orderManagementData";

type Option = {
  value: string;
  label: string;
};

type ItemOption = Option & {
  name: string;
  supplier: string;
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

type NewOrderModalProps = {
  open: boolean;
  itemOptions: ItemOption[];
  supplierOptions: Option[];
  currencyOptions: Option[];
  statusOptions: StatusOption[];
  documentOptions: DocumentOption[];
  onClose: () => void;
  onSave: (order: Omit<OrderRow, "id">) => void;
};

const emptyErrors = {
  orderDate: "",
  deliveryDate: "",
  itemCode: "",
  supplier: "",
  quantity: "",
  unitPrice: "",
  currency: "",
};

const getTodayString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const amountFormatter = new Intl.NumberFormat("en-US");

export default function NewOrderModal({
  open,
  itemOptions,
  supplierOptions,
  currencyOptions,
  statusOptions,
  documentOptions,
  onClose,
  onSave,
}: NewOrderModalProps) {
  const [form, setForm] = useState({
    orderDate: getTodayString(),
    deliveryDate: "",
    itemCode: "",
    itemName: "",
    supplier: "",
    quantity: "",
    unitPrice: "",
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
  });
  const [errors, setErrors] = useState(emptyErrors);

  const resetForm = () => {
    setForm({
      orderDate: getTodayString(),
      deliveryDate: "",
      itemCode: "",
      itemName: "",
      supplier: "",
      quantity: "",
      unitPrice: "",
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
    });
    setErrors(emptyErrors);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleItemChange = (value: string) => {
    const selected = itemOptions.find((option) => option.value === value);
    setForm((prev) => ({
      ...prev,
      itemCode: value,
      itemName: selected?.name ?? "",
      supplier: selected?.supplier ?? "",
      unitPrice: selected ? String(selected.unitPrice) : prev.unitPrice,
      currency: selected?.currency ?? prev.currency,
    }));
    setErrors((prev) => ({
      ...prev,
      itemCode: "",
      supplier: "",
      unitPrice: "",
      currency: "",
    }));
  };

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

  const handleSave = () => {
    const nextErrors = {
      orderDate: form.orderDate ? "" : "必須項目です",
      deliveryDate: form.deliveryDate ? "" : "必須項目です",
      itemCode: form.itemCode ? "" : "必須項目です",
      supplier: form.supplier ? "" : "必須項目です",
      quantity: form.quantity ? "" : "必須項目です",
      unitPrice: form.unitPrice ? "" : "必須項目です",
      currency: form.currency ? "" : "必須項目です",
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some((message) => message)) {
      return;
    }

    const parsedQuantity = Number(form.quantity);
    const parsedUnitPrice = Number(form.unitPrice);
    if (Number.isNaN(parsedQuantity) || Number.isNaN(parsedUnitPrice)) {
      setErrors((prev) => ({
        ...prev,
        quantity: Number.isNaN(parsedQuantity) ? "数値で入力してください" : prev.quantity,
        unitPrice: Number.isNaN(parsedUnitPrice) ? "数値で入力してください" : prev.unitPrice,
      }));
      return;
    }

    onSave({
      orderDate: form.orderDate,
      deliveryDate: form.deliveryDate,
      itemCode: form.itemCode,
      itemName: form.itemName,
      supplier: form.supplier,
      quantity: parsedQuantity,
      unitPrice: parsedUnitPrice,
      currency: form.currency,
      amount: parsedQuantity * parsedUnitPrice,
      note: form.note,
      status: form.status,
      documentStatus: form.documentStatus,
    });
    resetForm();
  };

  const itemLabel = useMemo(() => {
    const selected = itemOptions.find((option) => option.value === form.itemCode);
    return selected?.label ?? "";
  }, [form.itemCode, itemOptions]);

  const amountValue = useMemo(() => {
    if (!form.quantity || !form.unitPrice) {
      return null;
    }
    const quantity = Number(form.quantity);
    const unitPrice = Number(form.unitPrice);
    if (Number.isNaN(quantity) || Number.isNaN(unitPrice)) {
      return null;
    }
    return quantity * unitPrice;
  }, [form.quantity, form.unitPrice]);

  const amountLabel = useMemo(() => {
    if (amountValue === null || !form.currency) {
      return "-";
    }
    return `${form.currency} ${amountFormatter.format(amountValue)}`;
  }, [amountValue, form.currency]);

  return (
    <Modal
      open={open}
      title="新規発注"
      onClose={handleClose}
      actions={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outlined" onClick={handleClose}>
            キャンセル
          </Button>
          <Button variant="contained" startIcon={<Save size={16} />} onClick={handleSave}>
            保存
          </Button>
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
          品目/品番 <span className="text-red-500">*</span>
        </label>
        <Select
          size="small"
          value={form.itemCode}
          onChange={(event) => handleItemChange(event.target.value)}
          displayEmpty
          error={Boolean(errors.itemCode)}
          renderValue={(selected) => {
            if (!selected) {
              return <span className="text-gray-400">品目を選択してください</span>;
            }
            return itemLabel || selected;
          }}
        >
          {itemOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            数量 <span className="text-red-500">*</span>
          </label>
          <TextField
            size="small"
            type="number"
            inputProps={{ min: 0 }}
            value={form.quantity}
            onChange={(event) => handleChange("quantity", event.target.value)}
            error={Boolean(errors.quantity)}
            helperText={errors.quantity}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            単価 <span className="text-red-500">*</span>
          </label>
          <TextField
            size="small"
            type="number"
            inputProps={{ min: 0, step: "0.1" }}
            value={form.unitPrice}
            onChange={(event) => handleChange("unitPrice", event.target.value)}
            error={Boolean(errors.unitPrice)}
            helperText={errors.unitPrice}
          />
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
      </div>

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
              control={<Checkbox checked={form.documentStatus[option.value]} onChange={() => toggleDocumentStatus(option.value)} />}
              label={option.label}
              className="h-8"
            />
          ))}
        </FormGroup>
      </div>
    </Modal>
  );
}
