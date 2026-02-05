"use client";

import { useMemo, useState } from "react";
import { Autocomplete, Button, FormControl, FormHelperText, MenuItem, Select, TextField } from "@mui/material";
import { Save } from "lucide-react";
import Modal from "@/components/Modal";
import type { PaymentManagementRow, PaymentStatusKey } from "@/features/payment-management/types";
import { CURRENCY_OPTIONS } from "@/constants/currency";

type Option = {
  value: string;
  label: string;
};

type EditPaymentManagementModalProps = {
  open: boolean;
  payment: PaymentManagementRow | null;
  categoryOptions: Option[];
  paymentMethodOptions: Option[];
  statusOptions: Option[];
  onClose: () => void;
  onSave: (payment: PaymentManagementRow) => void;
  onDelete?: (payment: PaymentManagementRow) => void;
};

const emptyErrors = {
  transferDestinationName: "",
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
  paymentMethodOptions,
  statusOptions,
  onClose,
  onSave,
  onDelete,
}: EditPaymentManagementModalProps) {
  const getInitialForm = (row: PaymentManagementRow | null) => ({
    transferDestinationName: row?.transferDestinationName ?? "",
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
  const [actionError, setActionError] = useState<string | null>(null);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleNumberChange = (key: "amount", value: string) => {
    if (value.trim().startsWith("-")) {
      return;
    }
    handleChange(key, value);
  };

  const handleClose = () => {
    setActionError(null);
    onClose();
  };

  const handleSave = () => {
    setActionError(null);
    const amountValue = form.amount.trim();
    const parsedAmount = amountValue ? Number(form.amount) : 0;
    const nextErrors = { ...emptyErrors };
    if (amountValue && Number.isNaN(parsedAmount)) {
      nextErrors.amount = "数値で入力してください";
    } else if (amountValue && parsedAmount < 0) {
      nextErrors.amount = "0以上で入力してください";
    }

    setErrors(nextErrors);

    if (Object.values(nextErrors).some((message) => message)) {
      setActionError("入力内容をご確認ください。");
      return;
    }

    if (!payment) {
      return;
    }

    onSave({
      ...payment,
      transferDestinationName: form.transferDestinationName.trim(),
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
      onClose={handleClose}
      actions={
        <div className="flex w-full items-center gap-2">
          <Button variant="outlined" color="error" onClick={() => payment && onDelete?.(payment)} disabled={!payment}>
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
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">
          振込先名
        </label>
        <TextField
          size="small"
          placeholder="例: 山田商事株式会社"
          value={form.transferDestinationName}
          onChange={(event) => handleChange("transferDestinationName", event.target.value)}
          error={Boolean(errors.transferDestinationName)}
          helperText={errors.transferDestinationName}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            カテゴリ
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
            内容
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
            金額
          </label>
          <TextField
            size="small"
            type="number"
            placeholder="0"
            value={form.amount}
            onChange={(event) => handleNumberChange("amount", event.target.value)}
            error={Boolean(errors.amount)}
            helperText={errors.amount}
            slotProps={{ htmlInput: { min: 0 } }}
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
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            支払方法
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
            支払日
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
          ステータス
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
