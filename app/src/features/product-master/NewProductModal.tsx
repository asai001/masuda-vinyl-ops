"use client";

import React, { useMemo, useState } from "react";
import { Autocomplete, Button, Checkbox, FormControl, FormHelperText, ListItemText, MenuItem, Select, TextField } from "@mui/material";
import { Save } from "lucide-react";
import Modal from "@/components/Modal";
import type { NewProductInput, ProductRow } from "./types";
import { CURRENCY_OPTIONS } from "@/constants/currency";

type Option = {
  value: string;
  label: string;
};

type NewProductModalProps = {
  open: boolean;
  categoryOptions: Option[];
  unitOptions: Option[];
  statusOptions: Option[];
  materialOptions: Option[];
  existingProducts: ProductRow[];
  onClose: () => void;
  onSave: (product: NewProductInput) => void;
};

const emptyErrors = {
  code: "",
  name: "",
  packaging: "",
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

export default function NewProductModal({
  open,
  categoryOptions,
  unitOptions,
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
    packaging: "",
    weight: "0",
    length: "0",
    speed: "0",
    materials: [] as string[],
  });
  const [errors, setErrors] = useState(emptyErrors);
  const [actionError, setActionError] = useState<string | null>(null);

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
      packaging: "",
      weight: "0",
      length: "0",
      speed: "0",
      materials: [],
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
    setActionError(null);
  };

  const handleNumberChange = (key: "unitPrice" | "weight" | "length" | "speed" | "packaging", value: string) => {
    if (value.trim().startsWith("-")) {
      return;
    }
    handleChange(key, value);
  };

  const handleMaterialsChange = (value: string[]) => {
    setForm((prev) => ({ ...prev, materials: value }));
    setErrors((prev) => ({ ...prev, materials: "" }));
    setActionError(null);
  };

  const handleSave = () => {
    const codeValue = form.code.trim();
    const unitPriceValue = form.unitPrice.trim();
    const parsedPrice = unitPriceValue ? Number(form.unitPrice) : 0;
    const nextErrors = {
      ...emptyErrors,
      unitPrice: unitPriceValue && Number.isNaN(parsedPrice) ? "数値で入力してください" : "",
    };
    if (!nextErrors.unitPrice && unitPriceValue && parsedPrice < 0) {
      nextErrors.unitPrice = "0以上で入力してください";
    }

    const parseOptionalNumber = (value: string, key: "weight" | "length" | "speed") => {
      if (!value.trim()) {
        return null;
      }
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        nextErrors[key] = "数値で入力してください";
        return null;
      }
      if (parsed < 0) {
        nextErrors[key] = "0以上で入力してください";
        return null;
      }
      return parsed;
    };

    const parsedWeight = parseOptionalNumber(form.weight, "weight");
    const parsedLength = parseOptionalNumber(form.length, "length");
    const parsedSpeed = parseOptionalNumber(form.speed, "speed");

    const parsedPackaging = form.packaging.trim() ? Number(form.packaging) : null;
    if (parsedPackaging !== null && Number.isNaN(parsedPackaging)) {
      nextErrors.packaging = "数値で入力してください";
    } else if (parsedPackaging !== null && parsedPackaging < 0) {
      nextErrors.packaging = "0以上で入力してください";
    }

    if (codeValue) {
      const normalizedCode = codeValue.toLowerCase();
      const isDuplicate = existingProducts.some((row) => row.code.trim().toLowerCase() === normalizedCode);
      if (isDuplicate) {
        nextErrors.code = "既存の品番と重複しています";
      }
    }

    setErrors(nextErrors);

    if (Object.values(nextErrors).some((message) => message)) {
      setActionError("入力内容をご確認ください。");
      return;
    }
    setActionError(null);

    onSave({
      code: codeValue,
      name: form.name,
      packaging: parsedPackaging,
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
            品番
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
            品目名
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

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">梱包数（/box）</label>
        <TextField
          size="small"
          type="number"
          placeholder="例: 20"
          value={form.packaging}
          onChange={(event) => handleNumberChange("packaging", event.target.value)}
          error={Boolean(errors.packaging)}
          helperText={errors.packaging}
          slotProps={{ htmlInput: { min: 0, step: "1" } }}
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
                placeholder="選択または入力してください"
                error={Boolean(errors.category)}
                helperText={errors.category}
              />
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            単位
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
            標準単価
          </label>
          <TextField
            size="small"
            type="number"
            placeholder="0"
            value={form.unitPrice}
            onChange={(event) => handleNumberChange("unitPrice", event.target.value)}
            error={Boolean(errors.unitPrice)}
            helperText={errors.unitPrice}
            slotProps={{ htmlInput: { min: 0, step: "0.1" } }}
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

      <div className="border-t border-gray-200 pt-4">
        <div className="text-sm font-semibold text-gray-700">製品詳細</div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            重量 (g)
          </label>
          <TextField
            size="small"
            type="number"
            placeholder="0"
            value={form.weight}
            onChange={(event) => handleNumberChange("weight", event.target.value)}
            error={Boolean(errors.weight)}
            helperText={errors.weight}
            slotProps={{ htmlInput: { min: 0, step: "0.1" } }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            長さ (mm)
          </label>
          <TextField
            size="small"
            type="number"
            placeholder="0"
            value={form.length}
            onChange={(event) => handleNumberChange("length", event.target.value)}
            error={Boolean(errors.length)}
            helperText={errors.length}
            slotProps={{ htmlInput: { min: 0, step: "0.1" } }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            分速 (m/min)
          </label>
          <TextField
            size="small"
            type="number"
            placeholder="0"
            value={form.speed}
            onChange={(event) => handleNumberChange("speed", event.target.value)}
            error={Boolean(errors.speed)}
            helperText={errors.speed}
            slotProps={{ htmlInput: { min: 0, step: "0.1" } }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">
          使用材料
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
