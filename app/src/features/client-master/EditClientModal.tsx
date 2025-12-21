"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, MenuItem, Select, TextField } from "@mui/material";
import { Save } from "lucide-react";
import Modal from "@/components/Modal";
import { ClientRow } from "@/mock/clientMasterData";

type Option = {
  value: string;
  label: string;
};

type EditClientModalProps = {
  open: boolean;
  client: ClientRow | null;
  categoryOptions: Option[];
  regionOptions: Option[];
  currencyOptions: Option[];
  statusOptions: Option[];
  onClose: () => void;
  onSave: (client: ClientRow) => void;
};

const emptyErrors = {
  name: "",
  category: "",
  region: "",
  currency: "",
  status: "",
};

export default function EditClientModal({
  open,
  client,
  categoryOptions,
  regionOptions,
  currencyOptions,
  statusOptions,
  onClose,
  onSave,
}: EditClientModalProps) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    region: "",
    currency: "",
    status: "active",
    description: "",
  });
  const [errors, setErrors] = useState(emptyErrors);

  useEffect(() => {
    if (!client) {
      return;
    }
    setForm({
      name: client.name,
      category: client.category,
      region: client.region,
      currency: client.currency,
      status: client.status,
      description: client.description,
    });
    setErrors(emptyErrors);
  }, [client]);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSave = () => {
    const nextErrors = {
      name: form.name ? "" : "必須項目です",
      category: form.category ? "" : "必須項目です",
      region: form.region ? "" : "必須項目です",
      currency: form.currency ? "" : "必須項目です",
      status: form.status ? "" : "必須項目です",
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some((message) => message)) {
      return;
    }

    if (!client) {
      return;
    }

    onSave({
      ...client,
      name: form.name,
      description: form.description,
      category: form.category,
      region: form.region,
      currency: form.currency,
      status: form.status as ClientRow["status"],
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
        <>
          <Button variant="outlined" onClick={onClose}>
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
          仕入先 <span className="text-red-500">*</span>
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
          <label className="text-sm font-semibold text-gray-700">
            区分 <span className="text-red-500">*</span>
          </label>
          <Select
            size="small"
            value={form.category}
            onChange={(event) => handleChange("category", event.target.value)}
            displayEmpty
            error={Boolean(errors.category)}
            renderValue={(selected) => {
              if (!selected) {
                return <span className="text-gray-400">選択してください</span>;
              }
              const option = categoryOptions.find((item) => item.value === selected);
              return option?.label ?? selected;
            }}
          >
            {categoryOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            地域 <span className="text-red-500">*</span>
          </label>
          <Select
            size="small"
            value={form.region}
            onChange={(event) => handleChange("region", event.target.value)}
            displayEmpty
            error={Boolean(errors.region)}
            renderValue={(selected) => {
              if (!selected) {
                return <span className="text-gray-400">選択してください</span>;
              }
              const option = regionOptions.find((item) => item.value === selected);
              return option?.label ?? selected;
            }}
          >
            {regionOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
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
            renderValue={(selected) => {
              if (!selected) {
                return <span className="text-gray-400">選択してください</span>;
              }
              const option = currencyOptions.find((item) => item.value === selected);
              return option?.label ?? selected;
            }}
          >
            {currencyOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
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
          value={form.description}
          onChange={(event) => handleChange("description", event.target.value)}
        />
      </div>
    </Modal>
  );
}
