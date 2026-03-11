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
import { useLanguage } from "@/lib/i18n/language";
import type {
  SalesDocumentStatus,
  SalesDocumentStatusKey,
  SalesLineItem,
  SalesRow,
  SalesShipment,
  SalesStatus,
  SalesStatusKey,
} from "@/features/sales-management/types";

type Option = {
  value: string;
  label: string;
};

type ProductOption = Option & {
  name: string;
  materials: string[];
  unitPrice: number;
  currency: string;
  weight: number | null;
  length: number | null;
  speed: number | null;
};

type CustomerOption = Option & {
  region: string;
  currency: string;
};

type StatusOption = {
  value: SalesStatusKey;
  label: string;
};

type DocumentOption = {
  value: SalesDocumentStatusKey;
  label: string;
};

type ShipmentForm = {
  id: number;
  deliveryDate: string;
  shippedQuantity: string;
};

type ShipmentError = {
  deliveryDate?: string;
  shippedQuantity?: string;
};

type LineItemForm = {
  id: number;
  productCode: string;
  productName: string;
  materials: string[];
  orderQuantity: string;
  unitPrice: string;
  palletCount: string;
  totalWeight: string;
  stockQuantity: string;
  weight: number | null;
  length: number | null;
  speed: number | null;
  shipments: ShipmentForm[];
};

type LineItemError = {
  productCode?: string;
  orderQuantity?: string;
  unitPrice?: string;
  palletCount?: string;
  totalWeight?: string;
  stockQuantity?: string;
  shipments?: Record<number, ShipmentError>;
  shipmentTotal?: string;
};

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
  onIssue?: (order: SalesRow) => void;
  isIssuing?: boolean;
};

type SalesFormState = {
  orderNo: string;
  orderDate: string;
  customerName: string;
  customerRegion: string;
  currency: string;
  paidAmount: string;
  paidDate: string;
  note: string;
  status: SalesStatus;
  documentStatus: SalesDocumentStatus;
  items: LineItemForm[];
};

const emptyErrors = {
  orderNo: "",
  orderDate: "",
  customerName: "",
  currency: "",
  paidAmount: "",
  paidDate: "",
};

type ErrorKey = keyof typeof emptyErrors;

const amountFormatter = new Intl.NumberFormat("en-US");

const createEmptyShipment = (id: number, deliveryDate = ""): ShipmentForm => ({
  id,
  deliveryDate,
  shippedQuantity: "0",
});

const createEmptyItem = (id: number): LineItemForm => ({
  id,
  productCode: "",
  productName: "",
  materials: [],
  orderQuantity: "0",
  unitPrice: "0",
  palletCount: "0",
  totalWeight: "0",
  stockQuantity: "0",
  weight: null,
  length: null,
  speed: null,
  shipments: [],
});

const toShipmentForms = (item: SalesLineItem, fallbackDate = ""): ShipmentForm[] => {
  if (item.shipments.length) {
    return item.shipments.map((shipment) => ({
      id: shipment.id,
      deliveryDate: shipment.deliveryDate,
      shippedQuantity: String(shipment.shippedQuantity),
    }));
  }

  if ((item.deliveryDate || fallbackDate) && typeof item.shippedQuantity === "number") {
    return [
      {
        id: 1,
        deliveryDate: item.deliveryDate || fallbackDate,
        shippedQuantity: String(item.shippedQuantity),
      },
    ];
  }

  return [];
};

const getInitialForm = (row: SalesRow | null): SalesFormState => ({
  orderNo: row?.orderNo ?? "",
  orderDate: row?.orderDate ?? "",
  customerName: row?.customerName ?? "",
  customerRegion: row?.customerRegion ?? "",
  currency: row?.currency ?? "",
  paidAmount: String(row?.paidAmount ?? 0),
  paidDate: row?.paidDate ?? "",
  note: row?.note ?? "",
  status: row?.status ?? {
    shipped: false,
    delivered: false,
    paid: false,
  },
  documentStatus: row?.documentStatus ?? {
    orderReceived: false,
    deliverySent: false,
    invoiceSent: false,
  },
  items:
    row?.items.map((item) => ({
      id: item.id,
      productCode: item.productCode,
      productName: item.productName,
      materials: item.materials,
      orderQuantity: String(item.orderQuantity),
      unitPrice: String(item.unitPrice),
      palletCount: String(item.palletCount ?? 0),
      totalWeight: String(item.totalWeight ?? 0),
      stockQuantity: item.stockQuantity === null ? "0" : String(item.stockQuantity),
      weight: item.weight,
      length: item.length,
      speed: item.speed,
      shipments: toShipmentForms(item, row.deliveryDate),
    })) ?? [],
});

const getShipmentTotal = (shipments: ShipmentForm[]) =>
  shipments.reduce((sum, shipment) => {
    const quantity = Number(shipment.shippedQuantity);
    if (Number.isNaN(quantity)) {
      return sum;
    }
    return sum + quantity;
  }, 0);

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
  onIssue,
  isIssuing = false,
}: EditSalesModalProps) {
  const { tx } = useLanguage();
  const [form, setForm] = useState<SalesFormState>(() => getInitialForm(sales));
  const [errors, setErrors] = useState(emptyErrors);
  const [lineErrors, setLineErrors] = useState<Record<number, LineItemError>>({});
  const [itemsError, setItemsError] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const handleClose = () => {
    setActionError(null);
    onClose();
  };

  const handleChange = (key: keyof SalesFormState, value: string) => {
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
    setForm((prev) => ({ ...prev, items: [...prev.items, createEmptyItem(nextId)] }));
    setItemsError("");
  };

  const handleRemoveItem = (id: number) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
    setLineErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleLineChange = (
    id: number,
    key: "orderQuantity" | "unitPrice" | "palletCount" | "totalWeight" | "stockQuantity",
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

  const handleAddShipment = (itemId: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) {
          return item;
        }
        const nextShipmentId = item.shipments.length
          ? Math.max(...item.shipments.map((shipment) => shipment.id)) + 1
          : 1;
        return {
          ...item,
          shipments: [...item.shipments, createEmptyShipment(nextShipmentId, prev.orderDate)],
        };
      }),
    }));
  };

  const handleRemoveShipment = (itemId: number, shipmentId: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? { ...item, shipments: item.shipments.filter((shipment) => shipment.id !== shipmentId) }
          : item,
      ),
    }));
    setLineErrors((prev) => {
      const nextLine = { ...prev[itemId] };
      if (nextLine.shipments) {
        const nextShipments = { ...nextLine.shipments };
        delete nextShipments[shipmentId];
        nextLine.shipments = nextShipments;
      }
      return {
        ...prev,
        [itemId]: nextLine,
      };
    });
  };

  const handleShipmentChange = (
    itemId: number,
    shipmentId: number,
    key: "deliveryDate" | "shippedQuantity",
    value: string,
  ) => {
    if (key === "shippedQuantity" && value.trim().startsWith("-")) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              shipments: item.shipments.map((shipment) =>
                shipment.id === shipmentId ? { ...shipment, [key]: value } : shipment,
              ),
            }
          : item,
      ),
    }));

    setLineErrors((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        shipmentTotal: "",
        shipments: {
          ...(prev[itemId]?.shipments ?? {}),
          [shipmentId]: {
            ...(prev[itemId]?.shipments?.[shipmentId] ?? {}),
            [key]: "",
          },
        },
      },
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

  const amountValue = useMemo(() => {
    if (!form.items.length) {
      return null;
    }

    let hasValue = false;
    const total = form.items.reduce((sum, item) => {
      const quantity = Number(item.orderQuantity);
      const unitPrice = Number(item.unitPrice);
      if (!item.orderQuantity || !item.unitPrice || Number.isNaN(quantity) || Number.isNaN(unitPrice)) {
        return sum;
      }
      hasValue = true;
      return sum + quantity * unitPrice;
    }, 0);

    return hasValue ? total : null;
  }, [form.items]);

  const amountLabel = useMemo(() => {
    if (amountValue === null || !form.currency) {
      return "-";
    }
    return `${form.currency} ${amountFormatter.format(amountValue)}`;
  }, [amountValue, form.currency]);

  const validateHeader = (): boolean => {
    const nextErrors = { ...emptyErrors };
    if (!form.orderNo.trim()) {
      nextErrors.orderNo = "入力してください";
    }
    if (!form.orderDate.trim()) {
      nextErrors.orderDate = "入力してください";
    }
    if (!form.customerName.trim()) {
      nextErrors.customerName = "選択してください";
    }
    if (!form.currency.trim()) {
      nextErrors.currency = "選択してください";
    }
    const hasHeaderError = Object.values(nextErrors).some(Boolean);
    setErrors(nextErrors);
    return !hasHeaderError;
  };

  const buildNextSales = (): SalesRow | null => {
    setActionError(null);
    setItemsError("");
    setLineErrors({});

    if (!sales) {
      return null;
    }

    const validHeader = validateHeader();

    if (!form.items.length) {
      setItemsError("製品明細を追加してください。");
    }

    const paidAmountValue = form.paidAmount.trim();
    const paidAmount = paidAmountValue ? Number(form.paidAmount) : 0;
    const nextHeaderErrors: Partial<typeof emptyErrors> = {};
    if (paidAmountValue && Number.isNaN(paidAmount)) {
      nextHeaderErrors.paidAmount = "数値で入力してください";
    } else if (paidAmount < 0) {
      nextHeaderErrors.paidAmount = "0以上で入力してください";
    }
    if (paidAmount > 0 && !form.paidDate.trim()) {
      nextHeaderErrors.paidDate = "入金日を入力してください";
    }

    if (Object.keys(nextHeaderErrors).length) {
      setErrors((prev) => ({ ...prev, ...nextHeaderErrors }));
    }

    const numericErrors: Record<number, LineItemError> = {};
    const parsedItems: SalesLineItem[] = [];

    form.items.forEach((item) => {
      const hasShipmentInput = item.shipments.some(
        (shipment) => shipment.deliveryDate.trim() || shipment.shippedQuantity.trim(),
      );
      const hasInput = Boolean(
        item.productCode ||
          item.productName ||
          item.orderQuantity.trim() ||
          item.unitPrice.trim() ||
          item.palletCount.trim() ||
          item.totalWeight.trim() ||
          item.stockQuantity.trim() ||
          hasShipmentInput,
      );
      if (!hasInput) {
        return;
      }

      const orderQuantityValue = item.orderQuantity.trim();
      const unitPriceValue = item.unitPrice.trim();
      const palletCountValue = item.palletCount.trim();
      const totalWeightValue = item.totalWeight.trim();
      const stockQuantityValue = item.stockQuantity.trim();

      const orderQuantity = orderQuantityValue ? Number(item.orderQuantity) : 0;
      const unitPrice = unitPriceValue ? Number(item.unitPrice) : 0;
      const palletCount = palletCountValue ? Number(item.palletCount) : 0;
      const totalWeight = totalWeightValue ? Number(item.totalWeight) : 0;
      const stockQuantity = stockQuantityValue ? Number(item.stockQuantity) : 0;

      const itemError: LineItemError = {};
      if (!item.productCode) {
        itemError.productCode = "製品を選択してください";
      }
      if (orderQuantityValue && Number.isNaN(orderQuantity)) {
        itemError.orderQuantity = "数値で入力してください";
      }
      if (unitPriceValue && Number.isNaN(unitPrice)) {
        itemError.unitPrice = "数値で入力してください";
      }
      if (palletCountValue && Number.isNaN(palletCount)) {
        itemError.palletCount = "数値で入力してください";
      }
      if (totalWeightValue && Number.isNaN(totalWeight)) {
        itemError.totalWeight = "数値で入力してください";
      }
      if (stockQuantityValue && Number.isNaN(stockQuantity)) {
        itemError.stockQuantity = "数値で入力してください";
      }
      if (!itemError.orderQuantity && orderQuantityValue && orderQuantity < 0) {
        itemError.orderQuantity = "0以上で入力してください";
      }
      if (!itemError.unitPrice && unitPriceValue && unitPrice < 0) {
        itemError.unitPrice = "0以上で入力してください";
      }
      if (!itemError.palletCount && palletCountValue && palletCount < 0) {
        itemError.palletCount = "0以上で入力してください";
      }
      if (!itemError.totalWeight && totalWeightValue && totalWeight < 0) {
        itemError.totalWeight = "0以上で入力してください";
      }
      if (!itemError.stockQuantity && stockQuantityValue && stockQuantity < 0) {
        itemError.stockQuantity = "0以上で入力してください";
      }

      const shipmentErrors: Record<number, ShipmentError> = {};
      const parsedShipments: SalesShipment[] = [];

      item.shipments.forEach((shipment) => {
        const hasShipmentValue = shipment.deliveryDate.trim() || shipment.shippedQuantity.trim();
        if (!hasShipmentValue) {
          return;
        }

        const deliveryDate = shipment.deliveryDate.trim();
        const shippedQuantityValue = shipment.shippedQuantity.trim();
        const shippedQuantity = shippedQuantityValue ? Number(shipment.shippedQuantity) : 0;

        const shipmentError: ShipmentError = {};
        if (!deliveryDate) {
          shipmentError.deliveryDate = "出荷日を入力してください";
        }
        if (shippedQuantityValue && Number.isNaN(shippedQuantity)) {
          shipmentError.shippedQuantity = "数値で入力してください";
        }
        if (!shipmentError.shippedQuantity && shippedQuantityValue && shippedQuantity < 0) {
          shipmentError.shippedQuantity = "0以上で入力してください";
        }

        if (Object.keys(shipmentError).length) {
          shipmentErrors[shipment.id] = shipmentError;
          return;
        }

        parsedShipments.push({
          id: shipment.id,
          deliveryDate,
          shippedQuantity,
        });
      });

      const totalShippedQuantity = parsedShipments.reduce((sum, shipment) => sum + shipment.shippedQuantity, 0);
      if (totalShippedQuantity > orderQuantity) {
        itemError.shipmentTotal = "出荷数合計は注数以下で入力してください";
      }

      if (Object.keys(shipmentErrors).length) {
        itemError.shipments = shipmentErrors;
      }

      if (Object.keys(itemError).length) {
        numericErrors[item.id] = itemError;
        return;
      }

      parsedItems.push({
        id: item.id,
        productCode: item.productCode,
        productName: item.productName,
        materials: item.materials,
        stockQuantity,
        orderQuantity,
        unitPrice,
        palletCount,
        totalWeight,
        weight: item.weight,
        length: item.length,
        speed: item.speed,
        shipments: parsedShipments,
      });
    });

    if (!validHeader || !form.items.length || Object.keys(nextHeaderErrors).length || Object.keys(numericErrors).length) {
      if (Object.keys(numericErrors).length) {
        setLineErrors(numericErrors);
      }
      setActionError("入力内容をご確認ください。");
      return null;
    }

    const shippedAmount = parsedItems.reduce(
      (sum, item) =>
        sum +
        item.shipments.reduce((shipmentSum, shipment) => shipmentSum + shipment.shippedQuantity * item.unitPrice, 0),
      0,
    );
    const normalizedPaidAmount = form.status.paid && paidAmount === 0 ? shippedAmount : paidAmount;
    const primaryDeliveryDate =
      [...parsedItems.flatMap((item) => item.shipments.map((shipment) => shipment.deliveryDate)).filter(Boolean)]
        .sort((a, b) => a.localeCompare(b))[0] ?? "";

    return {
      ...sales,
      orderNo: form.orderNo.trim(),
      orderDate: form.orderDate,
      customerName: form.customerName,
      customerRegion: form.customerRegion,
      deliveryDate: primaryDeliveryDate,
      paidAmount: normalizedPaidAmount,
      paidDate: form.paidDate.trim(),
      currency: form.currency,
      note: form.note,
      items: parsedItems,
      status: form.status,
      documentStatus: form.documentStatus,
    };
  };

  const handleSave = () => {
    const next = buildNextSales();
    if (!next) {
      return;
    }
    void onSave(next);
  };

  const handleIssue = async () => {
    if (!sales || !onIssue) {
      return;
    }
    const next = buildNextSales();
    if (!next) {
      return;
    }
    const saved = await Promise.resolve(onSave(next));
    if (saved === false) {
      return;
    }
    onIssue(next);
    handleClose();
  };

  return (
    <Modal
      open={open}
      title="編集"
      onClose={handleClose}
      actions={
        <div className="flex w-full items-center gap-2">
          <Button variant="outlined" color="error" onClick={() => sales && onDelete?.(sales)} disabled={!sales}>
            削除
          </Button>
          {actionError ? <div className="text-xs text-red-600">{actionError}</div> : null}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outlined" onClick={handleIssue} disabled={!sales || isIssuing}>
              インボイス・パッキングリスト発行
            </Button>
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
          <label className="text-sm font-semibold text-gray-700">入金日</label>
          <TextField
            size="small"
            type="date"
            value={form.paidDate}
            onChange={(event) => handleChange("paidDate", event.target.value)}
            error={Boolean(errors.paidDate)}
            helperText={errors.paidDate}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <label className="text-sm font-semibold text-gray-700">入金額</label>
        <TextField
          size="small"
          type="number"
          value={form.paidAmount}
          onChange={(event) => handleChange("paidAmount", event.target.value)}
          error={Boolean(errors.paidAmount)}
          helperText={errors.paidAmount}
          slotProps={{ htmlInput: { min: 0, step: "0.1" } }}
        />
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
            const showCurrencyMismatch =
              Boolean(item.productCode) &&
              Boolean(form.currency) &&
              Boolean(selectedOption?.currency) &&
              selectedOption?.currency !== form.currency;

            return (
              <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-700">
                    {tx("製品")} #{index + 1}
                  </div>
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
                        slotProps={{ htmlInput: { min: 0, step: "0.1" } }}
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
                      <label className="text-sm font-semibold text-gray-700">総重量</label>
                      <TextField
                        size="small"
                        type="number"
                        value={item.totalWeight}
                        onChange={(event) => handleLineChange(item.id, "totalWeight", event.target.value)}
                        error={Boolean(itemError?.totalWeight)}
                        helperText={itemError?.totalWeight}
                        slotProps={{ htmlInput: { min: 0, step: "0.1" } }}
                      />
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
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-700">出荷明細</div>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Plus size={14} />}
                        onClick={() => handleAddShipment(item.id)}
                      >
                        出荷を追加
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      出荷数合計: {amountFormatter.format(getShipmentTotal(item.shipments))} / 注数:{" "}
                      {amountFormatter.format(Number(item.orderQuantity) || 0)}
                    </div>

                    {item.shipments.length === 0 ? (
                      <div className="mt-3 rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-500">
                        出荷明細はまだありません
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-col gap-3">
                        {item.shipments.map((shipment) => {
                          const shipmentError = itemError?.shipments?.[shipment.id];
                          return (
                            <div key={shipment.id} className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold text-gray-700">出荷 #{shipment.id}</div>
                                <Button
                                  variant="text"
                                  color="error"
                                  size="small"
                                  onClick={() => handleRemoveShipment(item.id, shipment.id)}
                                >
                                  削除
                                </Button>
                              </div>
                              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="flex flex-col gap-2">
                                  <label className="text-sm font-semibold text-gray-700">出荷日</label>
                                  <TextField
                                    size="small"
                                    type="date"
                                    value={shipment.deliveryDate}
                                    onChange={(event) =>
                                      handleShipmentChange(item.id, shipment.id, "deliveryDate", event.target.value)
                                    }
                                    error={Boolean(shipmentError?.deliveryDate)}
                                    helperText={shipmentError?.deliveryDate}
                                  />
                                </div>
                                <div className="flex flex-col gap-2">
                                  <label className="text-sm font-semibold text-gray-700">出荷数</label>
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={shipment.shippedQuantity}
                                    onChange={(event) =>
                                      handleShipmentChange(item.id, shipment.id, "shippedQuantity", event.target.value)
                                    }
                                    error={Boolean(shipmentError?.shippedQuantity)}
                                    helperText={shipmentError?.shippedQuantity}
                                    slotProps={{ htmlInput: { min: 0 } }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {itemError?.shipmentTotal ? <div className="mt-2 text-sm text-red-500">{itemError.shipmentTotal}</div> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
        <span>合計金額</span>
        <span>{amountLabel}</span>
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
