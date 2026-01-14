"use client";

import { useMemo, useState } from "react";
import { Autocomplete, Button, MenuItem, Select, TextField } from "@mui/material";
import { Save } from "lucide-react";
import Modal from "@/components/Modal";
import { ClientRow } from "../types";

type Option = {
  value: string;
  label: string;
};

type NewClientModalProps = {
  open: boolean;
  categoryOptions: Option[];
  regionOptions: Option[];
  currencyOptions: Option[];
  statusOptions: Option[];
  onClose: () => void;
  onSave: (client: Omit<ClientRow, "id">) => void;
};

const emptyErrors = {
  name: "",
  address: "",
  phone: "",
  category: "",
  region: "",
  currency: "",
  status: "",
};

const DEFAULT_CURRENCY_OPTIONS = ["USD", "VND", "JPY"] as const;

export default function NewClientModal({
  open,
  categoryOptions,
  regionOptions,
  currencyOptions,
  statusOptions,
  onClose,
  onSave,
}: NewClientModalProps) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    category: "",
    region: "",
    currency: "",
    status: "active",
    note: "",
  });
  const [errors, setErrors] = useState(emptyErrors);

  // statusOptions は画面上「有効/無効」の二択に固定するため、入力値としては使用しないと明示
  // ESLint/TS の「未使用変数」警告を消すための行
  void statusOptions;

  const currencyLabelOptions = useMemo(() => {
    const fromProps = currencyOptions.map((o) => o.label).filter(Boolean);
    const merged = [...DEFAULT_CURRENCY_OPTIONS, ...fromProps];
    // 重複除去（大文字小文字は区別しない）
    const uniq = Array.from(new Map(merged.map((v) => [v.toUpperCase(), v])).values());
    return uniq;
  }, [currencyOptions]);

  const resetForm = () => {
    setForm({
      name: "",
      address: "",
      phone: "",
      category: "",
      region: "",
      currency: "",
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
      name: form.name ? "" : "必須項目です",
      address: "",
      phone: "",
      category: form.category ? "" : "必須項目です",
      region: form.region ? "" : "必須項目です",
      currency: form.currency ? "" : "必須項目です",
      status: form.status ? "" : "必須項目です",
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some((message) => message)) {
      return;
    }

    onSave({
      clientId: crypto.randomUUID(),
      name: form.name,
      note: form.note,
      address: form.address,
      phone: form.phone,
      category: form.category,
      region: form.region,
      currency: form.currency,
      status: form.status as ClientRow["status"],
    });
    resetForm();
  };

  const statusLabel = useMemo(() => {
    return form.status === "inactive" ? "無効" : "有効";
  }, [form.status]);

  return (
    <Modal
      open={open}
      title="新規登録"
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
          取引先 <span className="text-red-500">*</span>
        </label>
        <TextField
          size="small"
          placeholder="例: Nguyen Trading Co., Ltd."
          value={form.name}
          onChange={(event) => handleChange("name", event.target.value)}
          error={Boolean(errors.name)}
          helperText={errors.name}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">住所</label>
          <TextField
            size="small"
            placeholder="例: No.102, Huu Nghi Road, VSIP Bac Ninh"
            value={form.address}
            onChange={(event) => handleChange("address", event.target.value)}
            error={Boolean(errors.address)}
            helperText={errors.address}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">電話番号</label>
          <TextField
            size="small"
            placeholder="例: 0241-3906-120"
            value={form.phone}
            onChange={(event) => handleChange("phone", event.target.value)}
            error={Boolean(errors.phone)}
            helperText={errors.phone}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            区分 <span className="text-red-500">*</span>
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
            地域 <span className="text-red-500">*</span>
          </label>
          <Autocomplete
            freeSolo
            options={regionOptions.map((option) => option.label)}
            value={form.region}
            inputValue={form.region}
            onChange={(_, newValue) => handleChange("region", newValue ?? "")}
            onInputChange={(_, newValue) => handleChange("region", newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="選択または入力"
                error={Boolean(errors.region)}
                helperText={errors.region}
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                placeholder="選択または入力"
                error={Boolean(errors.currency)}
                helperText={errors.currency}
              />
            )}
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
            {[
              { value: "active", label: "有効" },
              { value: "inactive", label: "無効" },
            ].map((option) => (
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
