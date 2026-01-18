"use client";

import { useState } from "react";
import { Autocomplete, Button, Checkbox, FormControlLabel, TextField } from "@mui/material";
import { Save } from "lucide-react";
import Modal from "@/components/Modal";
import type { NewPaymentInput } from "@/features/payment-master/types";

type Option = {
  value: string;
  label: string;
};

type NewPaymentModalProps = {
  open: boolean;
  categoryOptions: Option[];
  currencyOptions: Option[];
  paymentMethodOptions: Option[];
  onClose: () => void;
  onSave: (payment: NewPaymentInput) => void;
};

const emptyErrors = {
  category: "",
  content: "",
  fixedAmount: "",
  currency: "",
  paymentMethod: "",
  paymentDate: "",
};

export default function NewPaymentModal({
  open,
  categoryOptions,
  currencyOptions,
  paymentMethodOptions,
  onClose,
  onSave,
}: NewPaymentModalProps) {
  const [form, setForm] = useState({
    category: "",
    content: "",
    isFixedCost: true,
    fixedAmount: "",
    currency: "",
    paymentMethod: "",
    paymentDate: "",
    note: "",
  });
  const [errors, setErrors] = useState(emptyErrors);

  const resetForm = () => {
    setForm({
      category: "",
      content: "",
      isFixedCost: true,
      fixedAmount: "",
      currency: "",
      paymentMethod: "",
      paymentDate: "",
      note: "",
    });
    setErrors(emptyErrors);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (typeof value === "string") {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleFixedCostChange = (checked: boolean) => {
    setForm((prev) => ({ ...prev, isFixedCost: checked }));
    if (!checked) {
      setErrors((prev) => ({ ...prev, fixedAmount: "" }));
    }
  };

  const handleSave = () => {
    const nextErrors = {
      category: form.category ? "" : "必須項目です",
      content: form.content ? "" : "必須項目です",
      fixedAmount: "",
      currency: form.currency ? "" : "必須項目です",
      paymentMethod: form.paymentMethod ? "" : "必須項目です",
      paymentDate: form.paymentDate ? "" : "必須項目です",
    };

    const parsedPaymentDate = Number(form.paymentDate);
    if (!nextErrors.paymentDate && Number.isNaN(parsedPaymentDate)) {
      nextErrors.paymentDate = "数値で入力してください";
    }
    if (
      !nextErrors.paymentDate &&
      (!Number.isInteger(parsedPaymentDate) || parsedPaymentDate < 1 || parsedPaymentDate > 31)
    ) {
      nextErrors.paymentDate = "1〜31の整数で入力してください";
    }

    let parsedFixedAmount: number | null = null;
    if (form.isFixedCost) {
      if (!form.fixedAmount) {
        nextErrors.fixedAmount = "必須項目です";
      } else {
        parsedFixedAmount = Number(form.fixedAmount);
        if (Number.isNaN(parsedFixedAmount)) {
          nextErrors.fixedAmount = "数値で入力してください";
        }
      }
    }

    setErrors(nextErrors);

    if (Object.values(nextErrors).some((message) => message)) {
      return;
    }

    onSave({
      category: form.category,
      content: form.content,
      isFixedCost: form.isFixedCost,
      fixedAmount: form.isFixedCost ? parsedFixedAmount : null,
      currency: form.currency,
      paymentMethod: form.paymentMethod,
      paymentDate: parsedPaymentDate,
      note: form.note,
    });
    resetForm();
  };

  return (
    <Modal
      open={open}
      title="新規マスタ登録"
      onClose={handleClose}
      actions={
        <>
          <Button variant="outlined" onClick={handleClose}>
            キャンセル
          </Button>
          <Button variant="contained" startIcon={<Save size={16} />} onClick={handleSave}>
            保存
          </Button>
        </>
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

      <FormControlLabel
        control={<Checkbox checked={form.isFixedCost} onChange={(event) => handleFixedCostChange(event.target.checked)} />}
        label="固定費"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {form.isFixedCost ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">
              固定金額 <span className="text-red-500">*</span>
            </label>
            <TextField
              size="small"
              type="number"
              slotProps={{ htmlInput: { min: 0 } }}
              placeholder="0"
              value={form.fixedAmount}
              onChange={(event) => handleChange("fixedAmount", event.target.value)}
              error={Boolean(errors.fixedAmount)}
              helperText={errors.fixedAmount}
            />
          </div>
        ) : null}
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
            type="number"
            slotProps={{ htmlInput: { min: 1, max: 31 } }}
            placeholder="30"
            value={form.paymentDate}
            onChange={(event) => handleChange("paymentDate", event.target.value)}
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
