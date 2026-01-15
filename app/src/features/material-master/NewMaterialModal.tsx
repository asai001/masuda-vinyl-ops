"use client";

import React, { useMemo, useState } from "react";
import { Autocomplete, Button, MenuItem, Select, TextField } from "@mui/material";
import { Save } from "lucide-react";
import Modal from "@/components/Modal";
import { MaterialRow } from "@/mock/materialMasterData";

type Option = {
  value: string;
  label: string;
};

type NewMaterialModalProps = {
  open: boolean;
  categoryOptions: Option[];
  supplierOptions: Option[];
  unitOptions: Option[];
  currencyOptions: Option[];
  statusOptions: Option[];
  onClose: () => void;
  onSave: (material: Omit<MaterialRow, "id">) => void;
};

const emptyErrors = {
  code: "",
  name: "",
  supplier: "",
  category: "",
  unit: "",
  currency: "",
  unitPrice: "",
  status: "",
};

export default function NewMaterialModal({
  open,
  categoryOptions,
  supplierOptions,
  unitOptions,
  currencyOptions,
  statusOptions,
  onClose,
  onSave,
}: NewMaterialModalProps) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    supplier: "",
    category: "",
    unit: "",
    currency: "",
    unitPrice: "",
    status: "active",
    note: "",
  });
  const [errors, setErrors] = useState(emptyErrors);

  const resetForm = () => {
    setForm({
      code: "",
      name: "",
      supplier: "",
      category: "",
      unit: "",
      currency: "",
      unitPrice: "",
      status: "active",
      note: "",
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

  const handleSave = () => {
    const nextErrors = {
      code: form.code ? "" : "必須項目です",
      name: form.name ? "" : "必須項目です",
      supplier: form.supplier ? "" : "必須項目です",
      category: form.category ? "" : "必須項目です",
      unit: form.unit ? "" : "必須項目です",
      currency: form.currency ? "" : "必須項目です",
      unitPrice: form.unitPrice ? "" : "必須項目です",
      status: form.status ? "" : "必須項目です",
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some((message) => message)) {
      return;
    }

    const parsedPrice = Number(form.unitPrice);
    if (Number.isNaN(parsedPrice)) {
      setErrors((prev) => ({ ...prev, unitPrice: "数値で入力してください" }));
      return;
    }

    onSave({
      code: form.code,
      name: form.name,
      supplier: form.supplier,
      category: form.category,
      unit: form.unit,
      currency: form.currency,
      unitPrice: parsedPrice,
      status: form.status as MaterialRow["status"],
      note: form.note,
    });
    resetForm();
  };

  const statusLabel = useMemo(() => {
    const selected = statusOptions.find((option) => option.value === form.status);
    return selected?.label ?? "有効";
  }, [form.status, statusOptions]);

  return (
    <Modal
      open={open}
      title="新規材料"
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
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">
          品番 <span className="text-red-500">*</span>
        </label>
        <TextField
          size="small"
          placeholder="例: PI-001"
          value={form.code}
          onChange={(event) => handleChange("code", event.target.value)}
          error={Boolean(errors.code)}
          helperText={errors.code}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">
          品目名 <span className="text-red-500">*</span>
        </label>
        <TextField
          size="small"
          placeholder="例: 鋼材A"
          value={form.name}
          onChange={(event) => handleChange("name", event.target.value)}
          error={Boolean(errors.name)}
          helperText={errors.name}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            単位 <span className="text-red-500">*</span>
          </label>
          <Autocomplete
            freeSolo
            options={unitOptions.map((option) => option.label)}
            value={form.unit}
            inputValue={form.unit}
            onChange={(_, newValue) => handleChange("unit", newValue ?? "")}
            onInputChange={(_, newValue) => handleChange("unit", newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="選択または入力"
                error={Boolean(errors.unit)}
                helperText={errors.unit}
              />
            )}
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
            標準単価 <span className="text-red-500">*</span>
          </label>
          <TextField
            size="small"
            type="number"
            inputProps={{ min: 0, step: "0.1" }}
            placeholder="例: 3.5"
            value={form.unitPrice}
            onChange={(event) => handleChange("unitPrice", event.target.value)}
            error={Boolean(errors.unitPrice)}
            helperText={errors.unitPrice}
          />
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
    </Modal>
  );
}
