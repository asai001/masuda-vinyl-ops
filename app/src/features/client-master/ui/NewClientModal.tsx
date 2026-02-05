"use client";

import { useMemo, useState } from "react";
import { Autocomplete, Button, FormControl, FormHelperText, MenuItem, Select, TextField } from "@mui/material";
import { Save } from "lucide-react";
import Modal from "@/components/Modal";
import type { NewClientInput } from "../types";
import { CURRENCY_OPTIONS } from "@/constants/currency";

type Option = {
  value: string;
  label: string;
};

type NewClientModalProps = {
  open: boolean;
  isSaving?: boolean;
  categoryOptions: Option[];
  regionOptions: Option[];
  statusOptions: Option[];
  onClose: () => void;
  onSave: (input: NewClientInput) => void;
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

export default function NewClientModal({
  open,
  isSaving = false,
  categoryOptions,
  regionOptions,
  statusOptions,
  onClose,
  onSave,
}: NewClientModalProps) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    taxId: "",
    category: "",
    region: "",
    currency: "",
    status: "active" as "active" | "inactive",
    note: "",
  });
  const [errors, setErrors] = useState(emptyErrors);
  const [actionError, setActionError] = useState<string | null>(null);

  // statusOptions は画面上「有効/無効」の二択に固定するため、入力値としては使用しないと明示
  // ESLint/TS の「未使用変数」警告を消すための行
  void statusOptions;

  const resetForm = () => {
    setForm({
      name: "",
      address: "",
      phone: "",
      taxId: "",
      category: "",
      region: "",
      currency: "",
      status: "active",
      note: "",
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

  const handleSave = () => {
    setErrors(emptyErrors);
    setActionError(null);

    const normalizedStatus: NewClientInput["status"] = form.status === "inactive" ? "inactive" : "active";
    onSave({
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
        <div className="flex w-full items-center gap-2">
          {actionError ? <div className="text-xs text-red-600">{actionError}</div> : null}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outlined" onClick={handleClose} disabled={isSaving}>
              キャンセル
            </Button>
            <Button variant="contained" startIcon={<Save size={16} />} onClick={handleSave} disabled={isSaving}>
              保存
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">取引先</label>
        <TextField
          size="small"
          placeholder="例: Nguyen Trading Co., Ltd."
          value={form.name}
          onChange={(event) => handleChange("name", event.target.value)}
          disabled={isSaving}
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
            disabled={isSaving}
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
            disabled={isSaving}
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
          disabled={isSaving}
          error={Boolean(errors.taxId)}
          helperText={errors.taxId}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">区分</label>
          <Autocomplete
            freeSolo
            options={categoryOptions.map((option) => option.label)}
            value={form.category}
            inputValue={form.category}
            onChange={(_, newValue) => handleChange("category", newValue ?? "")}
            onInputChange={(_, newValue) => handleChange("category", newValue)}
            disabled={isSaving}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="選択または入力"
                disabled={isSaving}
                error={Boolean(errors.category)}
                helperText={errors.category}
              />
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">地域</label>
          <Autocomplete
            freeSolo
            options={regionOptions.map((option) => option.label)}
            value={form.region}
            inputValue={form.region}
            onChange={(_, newValue) => handleChange("region", newValue ?? "")}
            onInputChange={(_, newValue) => handleChange("region", newValue)}
            disabled={isSaving}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="選択または入力"
                disabled={isSaving}
                error={Boolean(errors.region)}
                helperText={errors.region}
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">通貨</label>
          <FormControl size="small" error={Boolean(errors.currency)} disabled={isSaving}>
            <Select
              size="small"
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
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">ステータス</label>
          <Select
            size="small"
            value={form.status}
            onChange={(event) => handleChange("status", event.target.value)}
            displayEmpty
            disabled={isSaving}
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
          disabled={isSaving}
          error={Boolean(errors.note)}
          helperText={errors.note}
        />
      </div>
    </Modal>
  );
}
