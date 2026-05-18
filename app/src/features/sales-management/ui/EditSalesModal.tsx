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
import SearchableSelect from "@/components/SearchableSelect";
import type { SalesDocumentStatusKey, SalesRow, SalesStatusKey } from "@/features/sales-management/types";
import {
  buildSalesOrderDraft,
  calculateLineAmount,
  calculateLineTotalWeight,
  createEmptyItem,
  emptyErrors,
  formatLineAmount,
  formatLineTotalWeight,
  getInitialEditForm,
  type CustomerOption,
  type DocumentOption,
  type ErrorKey,
  type LineItemError,
  type Option,
  type ProductOption,
  type SalesFormState,
  type StatusOption,
} from "@/features/sales-management/ui/salesOrderFormShared";
import { useLanguage } from "@/lib/i18n/language";

type EditSalesModalProps = {
  open: boolean;
  sales: SalesRow | null;
  productOptions: ProductOption[];
  customerOptions: CustomerOption[];
  currencyOptions: Option[];
  statusOptions: StatusOption[];
  documentOptions: DocumentOption[];
  onClose: () => void;
  onSave: (order: SalesRow) => Promise<boolean> | boolean | void;
  onDelete?: (order: SalesRow) => void;
};

export default function EditSalesModal({
  open,
  sales,
  productOptions,
  customerOptions,
  currencyOptions,
  statusOptions,
  documentOptions,
  onClose,
  onSave,
  onDelete,
}: EditSalesModalProps) {
  const { language, tx } = useLanguage();
  const tr = (ja: string, vi: string) => (language === "vi" ? vi : ja);
  const [form, setForm] = useState<SalesFormState>(() => getInitialEditForm(sales));
  const [errors, setErrors] = useState(emptyErrors);
  const [lineErrors, setLineErrors] = useState<Record<number, LineItemError>>({});
  const [itemsError, setItemsError] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const handleClose = () => {
    setActionError(null);
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

  const handleSave = async () => {
    if (!sales) {
      return;
    }
    const result = buildSalesOrderDraft(form, productOptions);
    if (!result.ok) {
      setErrors((prev) => ({ ...prev, ...result.headerErrors }));
      setLineErrors(result.lineErrors);
      setItemsError(result.itemsError);
      setActionError(result.actionError);
      return;
    }

    const saved = await Promise.resolve(
      onSave({
        ...sales,
        ...result.value,
      }),
    );
    if (saved === false) {
      return;
    }
  };

  return (
    <Modal
      open={open}
      title={tx("編集")}
      onClose={handleClose}
      paperSx={{
        width: { xs: "calc(100vw - 32px)", lg: 920 },
        maxWidth: { xs: "calc(100vw - 32px)", lg: 920 },
      }}
      actions={
        <div className="flex w-full items-center gap-2">
          <Button variant="outlined" color="error" onClick={() => sales && onDelete?.(sales)} disabled={!sales}>
            {tx("削除")}
          </Button>
          {actionError ? <div className="text-xs text-red-600">{tx(actionError)}</div> : null}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outlined" onClick={handleClose}>
              {tx("キャンセル")}
            </Button>
            <Button variant="contained" startIcon={<Save size={16} />} onClick={handleSave}>
              {tx("保存")}
            </Button>
          </div>
        </div>
      }
    >
      <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {tr(
          "出荷実績とインボイス・パッキングリスト発行は出荷管理画面で行います。",
          "Việc ghi nhận xuất hàng và phát hành hóa đơn/Phiếu đóng gói sẽ được thực hiện tại màn hình Quản lý xuất hàng.",
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">PO No.</label>
        <TextField
          size="small"
          placeholder="PO-2025-001"
          value={form.orderNo}
          onChange={(event) => handleChange("orderNo", event.target.value)}
          error={Boolean(errors.orderNo)}
          helperText={tx(errors.orderNo)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">{tx("受注日")}</label>
          <TextField
            size="small"
            type="date"
            value={form.orderDate}
            onChange={(event) => handleChange("orderDate", event.target.value)}
            error={Boolean(errors.orderDate)}
            helperText={tx(errors.orderDate)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">{tx("通貨")}</label>
          <FormControl size="small" error={Boolean(errors.currency)}>
            <Select
              value={form.currency}
              onChange={(event) => handleChange("currency", event.target.value)}
              displayEmpty
              renderValue={(selected) => {
                if (!selected) {
                  return <span className="text-gray-400">{tx("選択してください")}</span>;
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
            {errors.currency ? <FormHelperText>{tx(errors.currency)}</FormHelperText> : null}
          </FormControl>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">{tx("顧客名")}</label>
        <SearchableSelect
          value={form.customerName}
          options={customerOptions}
          onChange={handleCustomerChange}
          placeholder={tx("選択してください")}
          noOptionsText={tx("候補がありません")}
          error={Boolean(errors.customerName)}
          helperText={tx(errors.customerName)}
        />
      </div>

      <Divider />

      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">{tx("製品明細")}</label>
        <Button variant="contained" size="small" startIcon={<Plus size={16} />} onClick={handleAddItem}>
          {tx("製品を追加")}
        </Button>
      </div>
      {itemsError ? <div className="text-sm text-red-500">{tx(itemsError)}</div> : null}

      {form.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
          {tx("製品明細を追加してください")}
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
                  <div className="text-sm font-semibold text-gray-700">{tx(`製品 #${index + 1}`)}</div>
                  <Button variant="text" color="error" size="small" onClick={() => handleRemoveItem(item.id)}>
                    {tx("削除")}
                  </Button>
                </div>

                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      {tr("品目/品番", "Sản phẩm / Mã hàng")}
                      {showCurrencyMismatch ? (
                        <span className="text-xs font-normal text-amber-600">
                          {tr(
                            "マスターデータの通貨と一致していません。登録通貨:",
                            "Không khớp với tiền tệ trong dữ liệu master. Tiền tệ đã đăng ký:",
                          )}{" "}
                          {selectedOption?.currency}
                        </span>
                      ) : null}
                    </label>
                    <SearchableSelect
                      value={item.productCode}
                      options={productOptions}
                      onChange={(value) => handleProductSelect(item.id, value)}
                      placeholder={tx("製品を選択してください")}
                      noOptionsText={tx("候補がありません")}
                      error={Boolean(itemError?.productCode)}
                      helperText={itemError?.productCode ? tx(itemError.productCode) : ""}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">{tx("注数")}</label>
                      <TextField
                        size="small"
                        type="number"
                        value={item.orderQuantity}
                        onChange={(event) => handleLineChange(item.id, "orderQuantity", event.target.value)}
                        error={Boolean(itemError?.orderQuantity)}
                        helperText={itemError?.orderQuantity ? tx(itemError.orderQuantity) : ""}
                        slotProps={{ htmlInput: { min: 0 } }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">{tx("単価")}</label>
                      <TextField
                        size="small"
                        type="number"
                        value={item.unitPrice}
                        onChange={(event) => handleLineChange(item.id, "unitPrice", event.target.value)}
                        error={Boolean(itemError?.unitPrice)}
                        helperText={itemError?.unitPrice ? tx(itemError.unitPrice) : ""}
                        slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">{tr("パレット数", "Số pallet")}</label>
                      <TextField
                        size="small"
                        type="number"
                        value={item.palletCount}
                        onChange={(event) => handleLineChange(item.id, "palletCount", event.target.value)}
                        error={Boolean(itemError?.palletCount)}
                        helperText={itemError?.palletCount ? tx(itemError.palletCount) : ""}
                        slotProps={{ htmlInput: { min: 0 } }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">{tr("正味重量", "Khối lượng tịnh")}</label>
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-[9px] text-sm text-gray-700">
                        {totalWeightLabel}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">{tx("在庫数")}</label>
                      <TextField
                        size="small"
                        type="number"
                        value={item.stockQuantity}
                        onChange={(event) => handleLineChange(item.id, "stockQuantity", event.target.value)}
                        error={Boolean(itemError?.stockQuantity)}
                        helperText={itemError?.stockQuantity ? tx(itemError.stockQuantity) : ""}
                        slotProps={{ htmlInput: { min: 0 } }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-700">{tx("金額")}</label>
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
          <div className="text-xs text-blue-700">{tr("製品数", "Số sản phẩm")}</div>
          <div className="font-semibold text-blue-900">{form.items.length}</div>
        </div>
        <div>
          <div className="text-xs text-blue-700">{tr("注数量", "Số lượng đặt")}</div>
          <div className="font-semibold text-blue-900">{orderQuantity}</div>
        </div>
        <div>
          <div className="text-xs text-blue-700">{tx("合計金額")}</div>
          <div className="font-semibold text-blue-900">{formatLineAmount(orderAmount, form.currency)}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">{tx("備考")}</label>
        <TextField
          size="small"
          multiline
          minRows={3}
          placeholder={tx("備考を入力してください")}
          value={form.note}
          onChange={(event) => handleChange("note", event.target.value)}
        />
      </div>

      <Divider />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">{tx("ステータス")}</label>
        <FormGroup>
          {statusOptions.map((option) => (
            <FormControlLabel
              key={option.value}
              control={<Checkbox checked={form.status[option.value]} onChange={() => toggleStatus(option.value)} />}
              label={tx(option.label)}
              className="h-8"
            />
          ))}
        </FormGroup>
      </div>

      <Divider />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">{tx("請求状況")}</label>
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
              label={tx(option.label)}
              className="h-8"
            />
          ))}
        </FormGroup>
      </div>
    </Modal>
  );
}
