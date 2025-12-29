"use client";

import { useMemo, useState } from "react";
import { Autocomplete, Button, MenuItem, Select, TextField } from "@mui/material";
import { Save } from "lucide-react";
import Modal from "@/components/Modal";
import { PaymentManagementRow, PaymentStatusKey } from "@/mock/paymentManagementData";

type Option = {
  value: string;
  label: string;
};

type EditPaymentManagementModalProps = {
  open: boolean;
  payment: PaymentManagementRow | null;
  categoryOptions: Option[];
  currencyOptions: Option[];
  paymentMethodOptions: Option[];
  statusOptions: Option[];
  onClose: () => void;
  onSave: (payment: PaymentManagementRow) => void;
  onDelete?: (payment: PaymentManagementRow) => void;
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

export default function EditPaymentManagementModal({
  open,
  payment,
  categoryOptions,
  currencyOptions,
  paymentMethodOptions,
  statusOptions,
  onClose,
  onSave,
  onDelete,
}: EditPaymentManagementModalProps) {
  const getInitialForm = (row: PaymentManagementRow | null) => ({
    category: row?.category ?? "",
    content: row?.content ?? "",
    amount: row ? String(row.amount) : "",
    currency: row?.currency ?? "",
    paymentMethod: row?.paymentMethod ?? "",
    paymentDate: row?.paymentDate ?? "",
    status: row?.status ?? "unpaid",
    note: row?.note ?? "",
  });

  const [form, setForm] = useState(() => getInitialForm(payment));
  const [errors, setErrors] = useState(emptyErrors);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSave = () => {
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
      return;
    }

    if (!payment) {
      return;
    }

    onSave({
      ...payment,
      category: form.category,
      content: form.content,
      amount: parsedAmount,
      currency: form.currency,
      paymentMethod: form.paymentMethod,
      paymentDate: form.paymentDate,
      status: form.status as PaymentStatusKey,
      note: form.note,
    });
  };

  const statusLabel = useMemo(() => {
    const selected = statusOptions.find((option) => option.value === form.status);
    return selected?.label ?? "";
  }, [form.status, statusOptions]);

  return (
    <Modal
      open={open}
      title="支払編集"
      onClose={onClose}
      actions={
        <div className="flex w-full items-center justify-between">
          <Button variant="outlined" color="error" onClick={() => payment && onDelete?.(payment)} disabled={!payment}>
            削除
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outlined" onClick={onClose}>
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
            inputProps={{ min: 0 }}
            placeholder="0"
            value={form.amount}
            onChange={(event) => handleChange("amount", event.target.value)}
            error={Boolean(errors.amount)}
            helperText={errors.amount}
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
        <Select
          size="small"
          value={form.status}
          onChange={(event) => handleChange("status", event.target.value)}
          displayEmpty
          error={Boolean(errors.status)}
          renderValue={() => statusLabel}
        >
          {statusOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
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
