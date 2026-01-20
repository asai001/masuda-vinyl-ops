"use client";

import { useMemo, useState } from "react";
import { Autocomplete, Button, MenuItem, Select, TextField } from "@mui/material";
import { Save } from "lucide-react";
import Modal from "@/components/Modal";
import type { ClientRow } from "../types";
import { CURRENCY_OPTIONS } from "@/constants/currency";

type Option = {
  value: string;
  label: string;
};

type EditClientModalProps = {
  open: boolean;
  client: ClientRow | null;
  categoryOptions: Option[];
  regionOptions: Option[];
  statusOptions: Option[];
  onClose: () => void;
  onSave: (client: ClientRow) => void;
  onDelete?: (client: ClientRow) => void;
};

const emptyErrors = {
  name: "",
  address: "",
  phone: "",
  taxId: "",
  category: "",
  region: "",
  currency: "",
  status: "",
  note: "",
};

export default function EditClientModal({
  open,
  client,
  categoryOptions,
  regionOptions,
  statusOptions,
  onClose,
  onSave,
  onDelete,
}: EditClientModalProps) {
  const getInitialForm = (row: ClientRow | null) => ({
    name: row?.name ?? "",
    address: row?.address ?? "",
    phone: row?.phone ?? "",
    taxId: row?.taxId ?? "",
    category: row?.category ?? "",
    region: row?.region ?? "",
    currency: row?.currency ?? "",
    status: row?.status ?? "active",
    note: row?.note ?? "",
  });

  // statusOptions は画面上「有効/無効」の二択に固定するため、入力値としては使用しないと明示
  // ESLint/TS の「未使用変数」警告を消すための行
  void statusOptions;

  const [form, setForm] = useState(() => getInitialForm(client));
  const [errors, setErrors] = useState(emptyErrors);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const isBlank = (v: string) => v.trim().length === 0;
  const handleSave = () => {
    const nextErrors = {
      name: isBlank(form.name) ? "空白だけでは登録できません" : "",
      address: "",
      phone: "",
      taxId: "",
      category: isBlank(form.category) ? "空白だけでは登録できません" : "",
      region: isBlank(form.region) ? "空白だけでは登録できません" : "",
      currency: isBlank(form.currency) ? "空白だけでは登録できません" : "",
      status: isBlank(form.status) ? "空白だけでは登録できません" : "",
      note: "",
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    if (!client) {
      return;
    }

    const normalizedStatus: "active" | "inactive" = form.status === "inactive" ? "inactive" : "active";

    onSave({
      ...client,
      name: form.name.trim(),
      note: form.note.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      taxId: form.taxId.trim(),
      category: form.category.trim(),
      region: form.region.trim(),
      currency: form.currency.trim(),
      status: normalizedStatus,
    });
  };

  const statusLabel = useMemo(() => {
    return form.status === "inactive" ? "無効" : "有効";
  }, [form.status]);

  return (
    <Modal
      open={open}
      title="編集"
      onClose={onClose}
      actions={
        <div className="flex w-full items-center justify-between">
          <Button variant="outlined" color="error" onClick={() => client && onDelete?.(client)} disabled={!client}>
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

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">TAX ID</label>
        <TextField
          size="small"
          placeholder="e.g. 123456789"
          value={form.taxId}
          onChange={(event) => handleChange("taxId", event.target.value)}
          error={Boolean(errors.taxId)}
          helperText={errors.taxId}
        />
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
          <Select
            size="small"
            value={form.currency}
            onChange={(event) => handleChange("currency", event.target.value)}
            displayEmpty
            error={Boolean(errors.currency)}
            renderValue={(selected) => (selected ? selected : <span className="text-gray-400">選択してください</span>)}
          >
            {CURRENCY_OPTIONS.map((currency) => (
              <MenuItem key={currency} value={currency}>
                {currency}
              </MenuItem>
            ))}
          </Select>
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
          error={Boolean(errors.note)}
          helperText={errors.note}
        />
      </div>
    </Modal>
  );
}
