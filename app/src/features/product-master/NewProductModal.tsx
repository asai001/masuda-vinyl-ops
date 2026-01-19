"use client";

import React, { useMemo, useState } from "react";
import { Autocomplete, Button, Checkbox, ListItemText, MenuItem, Select, TextField } from "@mui/material";
import { Save } from "lucide-react";
import Modal from "@/components/Modal";
import type { NewProductInput, ProductRow } from "./types";

type Option = {
  value: string;
  label: string;
};

type NewProductModalProps = {
  open: boolean;
  categoryOptions: Option[];
  unitOptions: Option[];
  currencyOptions: Option[];
  statusOptions: Option[];
  materialOptions: Option[];
  existingProducts: ProductRow[];
  onClose: () => void;
  onSave: (product: NewProductInput) => void;
};

const emptyErrors = {
  code: "",
  name: "",
  category: "",
  unit: "",
  currency: "",
  unitPrice: "",
  status: "",
  weight: "",
  length: "",
  speed: "",
  materials: "",
};

const DEFAULT_CURRENCY_OPTIONS = ["USD", "VND", "JPY"] as const;

export default function NewProductModal({
  open,
  categoryOptions,
  unitOptions,
  currencyOptions,
  statusOptions,
  materialOptions,
  existingProducts,
  onClose,
  onSave,
}: NewProductModalProps) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "",
    unit: "",
    currency: "",
    unitPrice: "",
    status: "active",
    note: "",
    weight: "0",
    length: "0",
    speed: "0",
    materials: [] as string[],
  });
  const [errors, setErrors] = useState(emptyErrors);

  const currencyLabelOptions = useMemo(() => {
    const fromProps = currencyOptions.map((option) => option.label).filter(Boolean);
    const merged = [...DEFAULT_CURRENCY_OPTIONS, ...fromProps];
    const uniq = Array.from(new Map(merged.map((value) => [value.toUpperCase(), value])).values());
    return uniq;
  }, [currencyOptions]);

  const resetForm = () => {
    setForm({
      code: "",
      name: "",
      category: "",
      unit: "",
      currency: "",
      unitPrice: "",
      status: "active",
      note: "",
      weight: "0",
      length: "0",
      speed: "0",
      materials: [],
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

  const handleMaterialsChange = (value: string[]) => {
    setForm((prev) => ({ ...prev, materials: value }));
    setErrors((prev) => ({ ...prev, materials: "" }));
  };

  const handleSave = () => {
    const codeValue = form.code.trim();
    const nextErrors = {
      code: codeValue ? "" : "必須項目です",
      name: form.name ? "" : "必須項目です",
      category: form.category ? "" : "必須項目です",
      unit: form.unit ? "" : "必須項目です",
      currency: form.currency ? "" : "必須項目です",
      unitPrice: form.unitPrice ? "" : "必須項目です",
      status: form.status ? "" : "必須項目です",
      weight: "",
      length: "",
      speed: "",
      materials: form.materials.length ? "" : "必須項目です",
    };

    const parsedPrice = Number(form.unitPrice);
    if (!nextErrors.unitPrice && Number.isNaN(parsedPrice)) {
      nextErrors.unitPrice = "数値で入力してください";
    }

    const parseRequiredNumber = (value: string, key: "weight" | "length" | "speed") => {
      if (!value.trim()) {
        nextErrors[key] = "必須項目です";
        return null;
      }
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        nextErrors[key] = "数値で入力してください";
        return null;
      }
      return parsed;
    };

    const parsedWeight = parseRequiredNumber(form.weight, "weight");
    const parsedLength = parseRequiredNumber(form.length, "length");
    const parsedSpeed = parseRequiredNumber(form.speed, "speed");

    if (!nextErrors.code) {
      const normalizedCode = codeValue.toLowerCase();
      const isDuplicate = existingProducts.some((row) => row.code.trim().toLowerCase() === normalizedCode);
      if (isDuplicate) {
        nextErrors.code = "既存の品番と重複しています";
      }
    }

    setErrors(nextErrors);

    if (Object.values(nextErrors).some((message) => message)) {
      return;
    }

    onSave({
      code: codeValue,
      name: form.name,
      category: form.category,
      unit: form.unit,
      currency: form.currency,
      unitPrice: parsedPrice,
      status: form.status as ProductRow["status"],
      note: form.note,
      weight: parsedWeight,
      length: parsedLength,
      speed: parsedSpeed,
      materials: form.materials,
    });
    resetForm();
  };

  const statusLabel = useMemo(() => {
    const selected = statusOptions.find((option) => option.value === form.status);
    return selected?.label ?? "有効";
  }, [form.status, statusOptions]);

  const materialLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    materialOptions.forEach((option) => map.set(option.value, option.label));
    return map;
  }, [materialOptions]);

  return (
    <Modal
      open={open}
      title="新規製品"
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
            品番 <span className="text-red-500">*</span>
          </label>
          <TextField
            size="small"
            placeholder="品番"
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
            placeholder="品目名"
            value={form.name}
            onChange={(event) => handleChange("name", event.target.value)}
            error={Boolean(errors.name)}
            helperText={errors.name}
          />
        </div>
      </div>

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
                placeholder="選択または入力してください"
                error={Boolean(errors.category)}
                helperText={errors.category}
              />
            )}
          />
        </div>
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
                placeholder="選択または入力してください"
                error={Boolean(errors.unit)}
                helperText={errors.unit}
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
            placeholder="0"
            value={form.unitPrice}
            onChange={(event) => handleChange("unitPrice", event.target.value)}
            error={Boolean(errors.unitPrice)}
            helperText={errors.unitPrice}
            slotProps={{ htmlInput: { min: 0, step: "0.1" } }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            通貨 <span className="text-red-500">*</span>
          </label>
          <Autocomplete
            freeSolo
            options={currencyLabelOptions}
            value={form.currency}
            inputValue={form.currency}
            onChange={(_, newValue) => handleChange("currency", newValue ?? "")}
            onInputChange={(_, newValue) => handleChange("currency", newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="選択または入力してください"
                error={Boolean(errors.currency)}
                helperText={errors.currency}
              />
            )}
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

      <div className="border-t border-gray-200 pt-4">
        <div className="text-sm font-semibold text-gray-700">製品詳細</div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            重量 (g) <span className="text-red-500">*</span>
          </label>
          <TextField
            size="small"
            type="number"
            placeholder="0"
            value={form.weight}
            onChange={(event) => handleChange("weight", event.target.value)}
            error={Boolean(errors.weight)}
            helperText={errors.weight}
            slotProps={{ htmlInput: { min: 0, step: "0.1" } }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            長さ (mm) <span className="text-red-500">*</span>
          </label>
          <TextField
            size="small"
            type="number"
            placeholder="0"
            value={form.length}
            onChange={(event) => handleChange("length", event.target.value)}
            error={Boolean(errors.length)}
            helperText={errors.length}
            slotProps={{ htmlInput: { min: 0, step: "0.1" } }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            分速 (m/min) <span className="text-red-500">*</span>
          </label>
          <TextField
            size="small"
            type="number"
            placeholder="0"
            value={form.speed}
            onChange={(event) => handleChange("speed", event.target.value)}
            error={Boolean(errors.speed)}
            helperText={errors.speed}
            slotProps={{ htmlInput: { min: 0, step: "0.1" } }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">
          使用材料 <span className="text-red-500">*</span>
        </label>
        <Select
          size="small"
          multiple
          displayEmpty
          value={form.materials}
          onChange={(event) => handleMaterialsChange(event.target.value as string[])}
          error={Boolean(errors.materials)}
          renderValue={(selected) => {
            if (!selected.length) {
              return <span className="text-gray-400">選択してください</span>;
            }
            return selected.map((value) => materialLabelMap.get(value) ?? value).join(", ");
          }}
        >
          {materialOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Checkbox checked={form.materials.indexOf(option.value) > -1} />
              <ListItemText primary={option.label} />
            </MenuItem>
          ))}
        </Select>
        {errors.materials ? <div className="text-xs text-red-500">{errors.materials}</div> : null}
        {!materialOptions.length ? (
          <div className="text-xs text-gray-400">材料が登録されていません。</div>
        ) : null}
      </div>
    </Modal>
  );
}
