"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { Plus, Save } from "lucide-react";
import Modal from "@/components/Modal";
import type { NewSalesOrderInput, SalesDocumentStatusKey, SalesStatusKey } from "@/features/sales-management/types";
import {
  buildSalesOrderDraft,
  calculateLineAmount,
  calculateLineTotalWeight,
  createEmptyItem,
  emptyErrors,
  formatLineAmount,
  formatLineTotalWeight,
  getInitialCreateForm,
  type CustomerOption,
  type DocumentOption,
  type ErrorKey,
  type LineItemError,
  type Option,
  type ProductOption,
  type SalesFormState,
  type StatusOption,
} from "@/features/sales-management/ui/salesOrderFormShared";

type NewSalesModalProps = {
  open: boolean;
  productOptions: ProductOption[];
  customerOptions: CustomerOption[];
  currencyOptions: Option[];
  statusOptions: StatusOption[];
  documentOptions: DocumentOption[];
  onClose: () => void;
  onSave: (order: NewSalesOrderInput) => void;
};

export default function NewSalesModal({
  open,
  productOptions,
  customerOptions,
  currencyOptions,
  statusOptions,
  documentOptions,
  onClose,
  onSave,
}: NewSalesModalProps) {
  const [form, setForm] = useState<SalesFormState>(getInitialCreateForm);
  const [errors, setErrors] = useState(emptyErrors);
  const [lineErrors, setLineErrors] = useState<Record<number, LineItemError>>({});
  const [itemsError, setItemsError] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const resetForm = () => {
    setForm(getInitialCreateForm());
    setErrors(emptyErrors);
    setLineErrors({});
    setItemsError("");
    setActionError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (key: keyof Pick<SalesFormState, "orderNo" | "orderDate" | "currency" | "note">, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in emptyErrors) {
      setErrors((prev) => ({ ...prev, [key as ErrorKey]: "" }));
    }
  };

  const handleCustomerChange = (value: string) => {
    const selected = customerOptions.find((option) => option.value === value);
    setForm((prev) => ({
      ...prev,
      customerName: value,
      customerRegion: selected?.region ?? prev.customerRegion,
      currency: selected?.currency ?? prev.currency,
    }));
    setErrors((prev) => ({
      ...prev,
      customerName: "",
      currency: "",
    }));
  };

  const handleAddItem = () => {
    const nextId = form.items.length ? Math.max(...form.items.map((item) => item.id)) + 1 : 1;
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem(nextId)],
    }));
    setItemsError("");
  };

  const handleRemoveItem = (id: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
    setLineErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleLineChange = (
    id: number,
    key: "orderQuantity" | "unitPrice" | "palletCount" | "stockQuantity",
    value: string,
  ) => {
    if (value.trim().startsWith("-")) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }));
    setLineErrors((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: "" },
    }));
  };

  const handleProductSelect = (id: number, value: string) => {
    const selected = productOptions.find((option) => option.value === value);
    setForm((prev) => ({
      ...prev,
      currency: selected?.currency && !prev.currency ? selected.currency : prev.currency,
      items: prev.items.map((item) =>
        item.id === id
          ? {
              ...item,
              productCode: value,
              productName: selected?.name ?? "",
              materials: selected?.materials ?? [],
              unitPrice: selected ? String(selected.unitPrice) : item.unitPrice,
              weight: selected?.weight ?? null,
              length: selected?.length ?? null,
              speed: selected?.speed ?? null,
            }
          : item,
      ),
    }));
    setLineErrors((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        productCode: "",
        unitPrice: "",
      },
    }));
  };

  const toggleStatus = (key: SalesStatusKey) => {
    setForm((prev) => ({
      ...prev,
      status: { ...prev.status, [key]: !prev.status[key] },
    }));
  };

  const toggleDocumentStatus = (key: SalesDocumentStatusKey) => {
    setForm((prev) => ({
      ...prev,
      documentStatus: { ...prev.documentStatus, [key]: !prev.documentStatus[key] },
    }));
  };

  const orderQuantity = useMemo(
    () => form.items.reduce((sum, item) => sum + (Number(item.orderQuantity) || 0), 0),
    [form.items],
  );
  const orderAmount = useMemo(
    () => form.items.reduce((sum, item) => sum + (calculateLineAmount(item) ?? 0), 0),
    [form.items],
  );

  const handleSave = () => {
    const result = buildSalesOrderDraft(form, productOptions);
    if (!result.ok) {
      setErrors((prev) => ({ ...prev, ...result.headerErrors }));
      setLineErrors(result.lineErrors);
      setItemsError(result.itemsError);
      setActionError(result.actionError);
      return;
    }

    onSave(result.value);
    resetForm();
  };

  return (
    <Modal
      open={open}
      title="新規受注"
      onClose={handleClose}
      paperSx={{
        width: { xs: "calc(100vw - 32px)", lg: 920 },
        maxWidth: { xs: "calc(100vw - 32px)", lg: 920 },
      }}
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
      <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        出荷実績とインボイス・パッキングリスト発行は出荷管理画面で行います。
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">PO No.</label>
        <TextField
          size="small"
          placeholder="PO-2025-001"
          value={form.orderNo}
          onChange={(event) => handleChange("orderNo", event.target.value)}
          error={Boolean(errors.orderNo)}
          helperText={errors.orderNo}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">受注日</label>
          <TextField
            size="small"
            type="date"
            value={form.orderDate}
            onChange={(event) => handleChange("orderDate", event.target.value)}
            error={Boolean(errors.orderDate)}
            helperText={errors.orderDate}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">通貨</label>
          <FormControl size="small" error={Boolean(errors.currency)}>
            <Select
              value={form.currency}
              onChange={(event) => handleChange("currency", event.target.value)}
              displayEmpty
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
            {errors.currency ? <FormHelperText>{errors.currency}</FormHelperText> : null}
          </FormControl>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">顧客名</label>
        <FormControl size="small" error={Boolean(errors.customerName)}>
          <Select
            value={form.customerName}
            onChange={(event) => handleCustomerChange(event.target.value)}
            displayEmpty
            renderValue={(selected) => {
              if (!selected) {
                return <span className="text-gray-400">選択してください</span>;
              }
              const option = customerOptions.find((item) => item.value === selected);
              return option?.label ?? selected;
            }}
          >
            {customerOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{errors.customerName}</FormHelperText>
        </FormControl>
      </div>

      <Divider />

      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">製品明細</label>
        <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={handleAddItem}>
          製品を追加
        </Button>
      </div>
      {itemsError ? <div className="text-sm text-red-500">{itemsError}</div> : null}

      {form.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
          製品明細を追加してください
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {form.items.map((item, index) => {
            const itemError = lineErrors[item.id];
            const selectedOption = productOptions.find((option) => option.value === item.productCode);
            const totalWeightLabel = formatLineTotalWeight(calculateLineTotalWeight(item, productOptions));
            const lineAmountLabel = formatLineAmount(calculateLineAmount(item), form.currency);
            const showCurrencyMismatch =
              Boolean(item.productCode) &&
              Boolean(form.currency) &&
              Boolean(selectedOption?.currency) &&
              selectedOption?.currency !== form.currency;

            return (
              <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-700">製品 #{index + 1}</div>
                  <Button variant="text" color="error" size="small" onClick={() => handleRemoveItem(item.id)}>
                    削除
                  </Button>
                </div>

                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      品目/品番
                      {showCurrencyMismatch ? (
                        <span className="text-xs font-normal text-amber-600">
                          マスターデータの通貨と一致していません。登録通貨: {selectedOption?.currency}
                        </span>
                      ) : null}
                    </label>
                    <FormControl size="small" error={Boolean(itemError?.productCode)}>
                      <Select
                        value={item.productCode}
                        onChange={(event) => handleProductSelect(item.id, event.target.value)}
                        displayEmpty
                        renderValue={(selected) => {
                          if (!selected) {
                            return <span className="text-gray-400">製品を選択してください</span>;
                          }
                          const option = productOptions.find((optionItem) => optionItem.value === selected);
                          return option?.label ?? selected;
                        }}
                      >
                        {productOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {itemError?.productCode ? <FormHelperText>{itemError.productCode}</FormHelperText> : null}
                    </FormControl>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">注数</label>
                      <TextField
                        size="small"
                        type="number"
                        value={item.orderQuantity}
                        onChange={(event) => handleLineChange(item.id, "orderQuantity", event.target.value)}
                        error={Boolean(itemError?.orderQuantity)}
                        helperText={itemError?.orderQuantity}
                        slotProps={{ htmlInput: { min: 0 } }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">単価</label>
                      <TextField
                        size="small"
                        type="number"
                        value={item.unitPrice}
                        onChange={(event) => handleLineChange(item.id, "unitPrice", event.target.value)}
                        error={Boolean(itemError?.unitPrice)}
                        helperText={itemError?.unitPrice}
                        slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">パレット数</label>
                      <TextField
                        size="small"
                        type="number"
                        value={item.palletCount}
                        onChange={(event) => handleLineChange(item.id, "palletCount", event.target.value)}
                        error={Boolean(itemError?.palletCount)}
                        helperText={itemError?.palletCount}
                        slotProps={{ htmlInput: { min: 0 } }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">正味重量</label>
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-[9px] text-sm text-gray-700">
                        {totalWeightLabel}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">在庫数</label>
                      <TextField
                        size="small"
                        type="number"
                        value={item.stockQuantity}
                        onChange={(event) => handleLineChange(item.id, "stockQuantity", event.target.value)}
                        error={Boolean(itemError?.stockQuantity)}
                        helperText={itemError?.stockQuantity}
                        slotProps={{ htmlInput: { min: 0 } }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">金額</label>
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-[9px] text-sm text-gray-700">
                        {lineAmountLabel}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm md:grid-cols-3">
        <div>
          <div className="text-xs text-blue-700">製品数</div>
          <div className="font-semibold text-blue-900">{form.items.length}</div>
        </div>
        <div>
          <div className="text-xs text-blue-700">注数量</div>
          <div className="font-semibold text-blue-900">{orderQuantity}</div>
        </div>
        <div>
          <div className="text-xs text-blue-700">合計金額</div>
          <div className="font-semibold text-blue-900">{formatLineAmount(orderAmount, form.currency)}</div>
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

      <Divider />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">ステータス</label>
        <FormGroup>
          {statusOptions.map((option) => (
            <FormControlLabel
              key={option.value}
              control={<Checkbox checked={form.status[option.value]} onChange={() => toggleStatus(option.value)} />}
              label={option.label}
              className="h-8"
            />
          ))}
        </FormGroup>
      </div>

      <Divider />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">請求状況</label>
        <FormGroup>
          {documentOptions.map((option) => (
            <FormControlLabel
              key={option.value}
              control={
                <Checkbox
                  checked={form.documentStatus[option.value]}
                  onChange={() => toggleDocumentStatus(option.value)}
                />
              }
              label={option.label}
              className="h-8"
            />
          ))}
        </FormGroup>
      </div>
    </Modal>
  );
}
