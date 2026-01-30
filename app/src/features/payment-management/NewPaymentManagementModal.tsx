"use client";

import { useMemo, useState } from "react";
import { Autocomplete, Button, FormControl, FormHelperText, MenuItem, Select, TextField } from "@mui/material";
import { Save } from "lucide-react";
import Modal from "@/components/Modal";
import type { NewPaymentManagementInput, PaymentStatusKey } from "@/features/payment-management/types";
import { CURRENCY_OPTIONS } from "@/constants/currency";

type Option = {
  value: string;
  label: string;
};

type NewPaymentManagementModalProps = {
  open: boolean;
  categoryOptions: Option[];
  paymentMethodOptions: Option[];
  statusOptions: Option[];
  onClose: () => void;
  onSave: (payment: NewPaymentManagementInput) => void;
};

const emptyErrors = {
  category: "",
  content: "",
  amount: "",
  currency: "",
  paymentMethod: "",
  paymentDate: "",
  status: "",
};

export default function NewPaymentManagementModal({
  open,
  categoryOptions,
  paymentMethodOptions,
  statusOptions,
  onClose,
  onSave,
}: NewPaymentManagementModalProps) {
  const [form, setForm] = useState({
    category: "",
    content: "",
    amount: "",
    currency: "",
    paymentMethod: "",
    paymentDate: "",
    status: "unpaid",
    note: "",
  });
  const [errors, setErrors] = useState(emptyErrors);
  const [actionError, setActionError] = useState<string | null>(null);

  const resetForm = () => {
    setForm({
      category: "",
      content: "",
      amount: "",
      currency: "",
      paymentMethod: "",
      paymentDate: "",
      status: "unpaid",
      note: "",
    });
    setErrors(emptyErrors);
    setActionError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSave = () => {
    setActionError(null);
    const nextErrors = {
      category: form.category ? "" : "必須項目です",
      content: form.content ? "" : "必須項目です",
      amount: form.amount ? "" : "必須項目です",
      currency: form.currency ? "" : "必須項目です",
      paymentMethod: form.paymentMethod ? "" : "必須項目です",
      paymentDate: form.paymentDate ? "" : "必須項目です",
      status: form.status ? "" : "必須項目です",
    };

    const parsedAmount = Number(form.amount);
    if (!nextErrors.amount && Number.isNaN(parsedAmount)) {
      nextErrors.amount = "数値で入力してください";
    }

    setErrors(nextErrors);

    if (Object.values(nextErrors).some((message) => message)) {
      setActionError("必須項目が入力されていません");
      return;
    }

    onSave({
      category: form.category,
      content: form.content,
      amount: parsedAmount,
      currency: form.currency,
      paymentMethod: form.paymentMethod,
      paymentDate: form.paymentDate,
      status: form.status as PaymentStatusKey,
      note: form.note,
      isFixedCost: false,
    });
    resetForm();
  };

  const statusLabel = useMemo(() => {
    const selected = statusOptions.find((option) => option.value === form.status);
    return selected?.label ?? "";
  }, [form.status, statusOptions]);

  return (
    <Modal
      open={open}
      title="新規支払"
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            カテゴリ <span className="text-red-500">*</span>
          </label>
          <Autocomplete
            freeSolo
            options={categoryOptions.map((option) => option.label)}
            value={form.category}
            inputValue={form.category}
            onChange={(_, newValue) => handleChange("category", newValue ?? "")}
            onInputChange={(_, newValue) => handleChange("category", newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="選択または入力"
                error={Boolean(errors.category)}
                helperText={errors.category}
              />
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            内容 <span className="text-red-500">*</span>
          </label>
          <TextField
            size="small"
            placeholder="内容"
            value={form.content}
            onChange={(event) => handleChange("content", event.target.value)}
            error={Boolean(errors.content)}
            helperText={errors.content}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            金額 <span className="text-red-500">*</span>
          </label>
          <TextField
            size="small"
            type="number"
            placeholder="0"
            value={form.amount}
            onChange={(event) => handleChange("amount", event.target.value)}
            error={Boolean(errors.amount)}
            helperText={errors.amount}
            slotProps={{ htmlInput: { min: 0 } }}
          />
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
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            支払方法 <span className="text-red-500">*</span>
          </label>
          <Autocomplete
            freeSolo
            options={paymentMethodOptions.map((option) => option.label)}
            value={form.paymentMethod}
            inputValue={form.paymentMethod}
            onChange={(_, newValue) => handleChange("paymentMethod", newValue ?? "")}
            onInputChange={(_, newValue) => handleChange("paymentMethod", newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="選択または入力"
                error={Boolean(errors.paymentMethod)}
                helperText={errors.paymentMethod}
              />
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            支払日 <span className="text-red-500">*</span>
          </label>
          <TextField
            size="small"
            type="date"
            value={form.paymentDate}
            onChange={(event) => handleChange("paymentDate", event.target.value)}
            error={Boolean(errors.paymentDate)}
            helperText={errors.paymentDate}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">
          ステータス <span className="text-red-500">*</span>
        </label>
        <FormControl size="small" error={Boolean(errors.status)}>
          <Select
            value={form.status}
            onChange={(event) => handleChange("status", event.target.value)}
            displayEmpty
            renderValue={() => statusLabel}
          >
            {statusOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{errors.status}</FormHelperText>
        </FormControl>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">備考</label>
        <TextField
          size="small"
          multiline
          minRows={3}
          placeholder="備考"
          value={form.note}
          onChange={(event) => handleChange("note", event.target.value)}
        />
      </div>
    </Modal>
  );
}
