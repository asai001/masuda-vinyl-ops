"use client";

import { useState } from "react";
import { Autocomplete, Button, Checkbox, FormControl, FormControlLabel, FormHelperText, MenuItem, Select, TextField } from "@mui/material";
import { Save } from "lucide-react";
import Modal from "@/components/Modal";
import type { PaymentRow } from "@/features/payment-master/types";
import { CURRENCY_OPTIONS } from "@/constants/currency";

type Option = {
  value: string;
  label: string;
};

type EditPaymentModalProps = {
  open: boolean;
  payment: PaymentRow | null;
  categoryOptions: Option[];
  paymentMethodOptions: Option[];
  onClose: () => void;
  onSave: (payment: PaymentRow) => void;
  onDelete?: (payment: PaymentRow) => void;
};

const emptyErrors = {
  transferDestinationName: "",
  category: "",
  content: "",
  fixedAmount: "",
  currency: "",
  paymentMethod: "",
  paymentDate: "",
};

export default function EditPaymentModal({
  open,
  payment,
  categoryOptions,
  paymentMethodOptions,
  onClose,
  onSave,
  onDelete,
}: EditPaymentModalProps) {
  const getInitialForm = (row: PaymentRow | null) => ({
    transferDestinationName: row?.transferDestinationName ?? "",
    category: row?.category ?? "",
    content: row?.content ?? "",
    isFixedCost: row?.isFixedCost ?? true,
    fixedAmount: row?.fixedAmount === null || row?.fixedAmount === undefined ? "" : String(row.fixedAmount),
    currency: row?.currency ?? "",
    paymentMethod: row?.paymentMethod ?? "",
    paymentDate: row?.paymentDate ? String(row.paymentDate) : "",
    note: row?.note ?? "",
  });

  const [form, setForm] = useState(() => getInitialForm(payment));
  const [errors, setErrors] = useState(emptyErrors);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleChange = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (typeof value === "string") {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
    setActionError(null);
  };

  const handleNumberChange = (key: "fixedAmount" | "paymentDate", value: string) => {
    if (value.trim().startsWith("-")) {
      return;
    }
    handleChange(key, value);
  };

  const handleFixedCostChange = (checked: boolean) => {
    setForm((prev) => ({ ...prev, isFixedCost: checked }));
    if (!checked) {
      setErrors((prev) => ({ ...prev, fixedAmount: "" }));
    }
    setActionError(null);
  };

  const handleSave = () => {
    const nextErrors = { ...emptyErrors };

    const paymentDateValue = form.paymentDate.trim();
    const parsedPaymentDate = paymentDateValue ? Number(form.paymentDate) : 0;
    if (paymentDateValue && Number.isNaN(parsedPaymentDate)) {
      nextErrors.paymentDate = "数値で入力してください";
    }
    if (
      paymentDateValue &&
      !nextErrors.paymentDate &&
      (!Number.isInteger(parsedPaymentDate) || parsedPaymentDate < 1 || parsedPaymentDate > 31)
    ) {
      nextErrors.paymentDate = "1〜31の整数で入力してください";
    }

    let parsedFixedAmount: number | null = null;
    if (form.isFixedCost) {
      const fixedAmountValue = form.fixedAmount.trim();
      if (fixedAmountValue) {
        parsedFixedAmount = Number(form.fixedAmount);
        if (Number.isNaN(parsedFixedAmount)) {
          nextErrors.fixedAmount = "数値で入力してください";
        }
      }
    }

    setErrors(nextErrors);

    if (Object.values(nextErrors).some((message) => message)) {
      setActionError("入力内容をご確認ください。");
      return;
    }
    setActionError(null);

    if (!payment) {
      return;
    }

    onSave({
      ...payment,
      transferDestinationName: form.transferDestinationName.trim(),
      category: form.category,
      content: form.content,
      isFixedCost: form.isFixedCost,
      fixedAmount: form.isFixedCost ? parsedFixedAmount : null,
      currency: form.currency,
      paymentMethod: form.paymentMethod,
      paymentDate: parsedPaymentDate,
      note: form.note,
    });
  };

  return (
    <Modal
      open={open}
      title="支払いマスタ編集"
      onClose={onClose}
      actions={
        <div className="flex w-full items-center gap-2">
          <Button variant="outlined" color="error" onClick={() => payment && onDelete?.(payment)} disabled={!payment}>
            削除
          </Button>
          {actionError ? <div className="text-xs text-red-600">{actionError}</div> : null}
          <div className="ml-auto flex items-center gap-2">
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

      <FormControlLabel
        control={<Checkbox checked={form.isFixedCost} onChange={(event) => handleFixedCostChange(event.target.checked)} />}
        label="固定費"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {form.isFixedCost ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">
              固定金額
            </label>
            <TextField
              size="small"
              type="number"
              slotProps={{ htmlInput: { min: 0 } }}
              placeholder="0"
              value={form.fixedAmount}
              onChange={(event) => handleNumberChange("fixedAmount", event.target.value)}
              error={Boolean(errors.fixedAmount)}
              helperText={errors.fixedAmount}
            />
          </div>
        ) : null}
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
            type="number"
            slotProps={{ htmlInput: { min: 1, max: 31 } }}
            placeholder="30"
            value={form.paymentDate}
            onChange={(event) => handleNumberChange("paymentDate", event.target.value)}
            error={Boolean(errors.paymentDate)}
            helperText={errors.paymentDate}
          />
        </div>
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
