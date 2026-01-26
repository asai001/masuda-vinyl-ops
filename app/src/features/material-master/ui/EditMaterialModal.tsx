"use client";

import React, { useMemo, useState } from "react";
import { Autocomplete, Button, FormControl, FormHelperText, MenuItem, Select, TextField } from "@mui/material";
import { Save } from "lucide-react";
import Modal from "@/components/Modal";
import { MaterialRow } from "../types";
import { CURRENCY_OPTIONS } from "@/constants/currency";

type Option = {
  value: string;
  label: string;
};

type EditMaterialModalProps = {
  open: boolean;
  material: MaterialRow | null;
  existingMaterials: MaterialRow[];
  categoryOptions: Option[];
  supplierOptions: Option[];
  unitOptions: Option[];
  statusOptions: Option[];
  supplierCurrencyMap: Record<string, string>;
  onClose: () => void;
  onSave: (material: MaterialRow) => void;
  onDelete?: (material: MaterialRow) => void;
};

const isBlank = (v: string) => v.trim().length === 0;
const normalizeCode = (value: string) => value.trim().toLowerCase();

const emptyErrors = {
  code: "",
  name: "",
  supplier: "",
  category: "",
  unit: "",
  currency: "",
  unitPrice: "",
  status: "",
  note: "",
};

export default function EditMaterialModal({
  open,
  material,
  existingMaterials,
  categoryOptions,
  supplierOptions,
  unitOptions,
  statusOptions,
  supplierCurrencyMap,
  onClose,
  onSave,
  onDelete,
}: EditMaterialModalProps) {
  const getInitialForm = (row: MaterialRow | null) => ({
    code: row?.code ?? "",
    name: row?.name ?? "",
    supplier: row?.supplier ?? "",
    category: row?.category ?? "",
    unit: row?.unit ?? "",
    currency: row?.currency ?? "",
    unitPrice: row ? String(row.unitPrice) : "",
    status: row?.status ?? "active",
    note: row?.note ?? "",
  });

  const [form, setForm] = useState(() => getInitialForm(material));
  const [errors, setErrors] = useState(emptyErrors);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSupplierSelect = (supplier: string) => {
    const mapped = supplierCurrencyMap[supplier]?.trim().toUpperCase();
    const normalizedCurrency = mapped && CURRENCY_OPTIONS.includes(mapped as (typeof CURRENCY_OPTIONS)[number]) ? mapped : "";

    setForm((prev) => ({
      ...prev,
      supplier,
      currency: normalizedCurrency ? normalizedCurrency : prev.currency,
    }));

    setErrors((prev) => ({
      ...prev,
      supplier: "",
      currency: normalizedCurrency ? "" : prev.currency,
    }));
  };

  const handleSave = () => {
    const nextErrors = {
      code: isBlank(form.code) ? "空文字だけでは登録できません" : "",
      name: isBlank(form.name) ? "空文字だけでは登録できません" : "",
      supplier: isBlank(form.supplier) ? "空文字だけでは登録できません" : "",
      category: isBlank(form.category) ? "空文字だけでは登録できません" : "",
      unit: isBlank(form.unit) ? "空文字だけでは登録できません" : "",
      currency: isBlank(form.currency) ? "空文字だけでは登録できません" : "",
      unitPrice: isBlank(form.unitPrice) ? "空文字だけでは登録できません" : "",
      status: isBlank(form.status) ? "空文字だけでは登録できません" : "",
      note: "",
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

    if (!material) {
      return;
    }

    const normalizedCode = normalizeCode(form.code);
    if (normalizedCode) {
      const hasDuplicate = existingMaterials.some((row) => {
        if (row.materialId === material.materialId) {
          return false;
        }
        return normalizeCode(row.code) === normalizedCode;
      });
      if (hasDuplicate) {
        setErrors((prev) => ({ ...prev, code: "品番が既に登録されています" }));
        return;
      }
    }

    onSave({
      ...material,
      code: form.code.trim(),
      name: form.name.trim(),
      supplier: form.supplier.trim(),
      category: form.category.trim(),
      unit: form.unit.trim(),
      currency: form.currency.trim(),
      unitPrice: parsedPrice,
      status: form.status as MaterialRow["status"],
      note: form.note, // 空OK
    });
  };

  const statusLabel = useMemo(() => {
    const selected = statusOptions.find((option) => option.value === form.status);
    return selected?.label ?? "有効";
  }, [form.status, statusOptions]);

  return (
    <Modal
      open={open}
      title="編集"
      onClose={onClose}
      actions={
        <div className="flex w-full items-center justify-between">
          <Button
            variant="outlined"
            color="error"
            onClick={() => material && onDelete?.(material)}
            disabled={!material}
          >
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
          <Autocomplete
            options={supplierOptions}
            value={supplierOptions.find((o) => o.value === form.supplier) ?? null}
            onChange={(_, newValue) => handleSupplierSelect(newValue?.value ?? "")}
            getOptionLabel={(opt) => opt.label}
            isOptionEqualToValue={(opt, val) => opt.value === val.value}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="検索して選択"
                error={Boolean(errors.supplier)}
                helperText={errors.supplier}
              />
            )}
          />
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
            標準単価 <span className="text-red-500">*</span>
          </label>
        <TextField
          size="small"
          type="number"
          placeholder="例: 3.5"
          value={form.unitPrice}
          onChange={(event) => handleChange("unitPrice", event.target.value)}
          error={Boolean(errors.unitPrice)}
          helperText={errors.unitPrice}
          slotProps={{ htmlInput: { min: 0, step: "0.1" } }}
        />
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
