import { applyOrderShipmentsToLineItems } from "@/features/sales-management/salesManagementUtils";
import type {
  SalesDocumentStatus,
  SalesDocumentStatusKey,
  SalesLineItem,
  SalesOrderShipment,
  SalesRow,
  SalesStatus,
  SalesStatusKey,
} from "@/features/sales-management/types";

export type Option = {
  value: string;
  label: string;
};

export type ProductOption = Option & {
  name: string;
  materials: string[];
  unitPrice: number;
  currency: string;
  weight: number | null;
  length: number | null;
  speed: number | null;
};

export type CustomerOption = Option & {
  region: string;
  currency: string;
};

export type StatusOption = {
  value: SalesStatusKey;
  label: string;
};

export type DocumentOption = {
  value: SalesDocumentStatusKey;
  label: string;
};

export type ShipmentLineForm = {
  id: number;
  lineItemId: number;
  shippedQuantity: string;
};

export type ShipmentForm = {
  id: number;
  deliveryDate: string;
  paidDate: string;
  paidAmount: string;
  items: ShipmentLineForm[];
};

export type ShipmentLineError = {
  shippedQuantity?: string;
};

export type ShipmentError = {
  deliveryDate?: string;
  paidDate?: string;
  paidAmount?: string;
  items?: Record<number, ShipmentLineError>;
};

export type LineItemForm = {
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
};

export type LineItemError = {
  productCode?: string;
  orderQuantity?: string;
  unitPrice?: string;
  palletCount?: string;
  totalWeight?: string;
  stockQuantity?: string;
  shipmentTotal?: string;
};

export type SalesFormState = {
  orderNo: string;
  orderDate: string;
  customerName: string;
  customerRegion: string;
  currency: string;
  note: string;
  status: SalesStatus;
  documentStatus: SalesDocumentStatus;
  items: LineItemForm[];
  shipments: ShipmentForm[];
};

export const emptyErrors = {
  orderNo: "",
  orderDate: "",
  customerName: "",
  currency: "",
};

export type ErrorKey = keyof typeof emptyErrors;

export type SalesOrderDraft = Omit<SalesRow, "id" | "salesOrderId">;

export type SalesOrderFormBuildSuccess = {
  ok: true;
  value: SalesOrderDraft;
};

export type SalesOrderFormBuildFailure = {
  ok: false;
  headerErrors: Partial<typeof emptyErrors>;
  lineErrors: Record<number, LineItemError>;
  shipmentErrors: Record<number, ShipmentError>;
  itemsError: string;
  actionError: string;
};

export type SalesOrderFormBuildResult = SalesOrderFormBuildSuccess | SalesOrderFormBuildFailure;

export const amountFormatter = new Intl.NumberFormat("en-US");
export const lineAmountFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
export const weightFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 3,
});

export const getTodayString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseNumberInput = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const createEmptyItem = (id: number): LineItemForm => ({
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
});

export const createShipmentLinesForItems = (items: LineItemForm[]): ShipmentLineForm[] =>
  items.map((item, index) => ({
    id: index + 1,
    lineItemId: item.id,
    shippedQuantity: "0",
  }));

export const createEmptyShipment = (id: number, items: LineItemForm[]): ShipmentForm => ({
  id,
  deliveryDate: "",
  paidDate: "",
  paidAmount: "0",
  items: createShipmentLinesForItems(items),
});

export const syncShipmentLinesWithItems = (shipments: ShipmentForm[], items: LineItemForm[]): ShipmentForm[] =>
  shipments.map((shipment) => {
    const existingByLineId = new Map(shipment.items.map((entry) => [entry.lineItemId, entry]));
    return {
      ...shipment,
      items: items.map((item, index) => ({
        id: existingByLineId.get(item.id)?.id ?? index + 1,
        lineItemId: item.id,
        shippedQuantity: existingByLineId.get(item.id)?.shippedQuantity ?? "0",
      })),
    };
  });

export const resolveLineUnitWeight = (
  item: Pick<LineItemForm, "productCode" | "weight">,
  productOptions: ProductOption[],
) => {
  const productWeight = productOptions.find((option) => option.value === item.productCode)?.weight;
  if (typeof productWeight === "number" && Number.isFinite(productWeight)) {
    return productWeight;
  }
  return typeof item.weight === "number" && Number.isFinite(item.weight) ? item.weight : null;
};

export const calculateLineTotalWeight = (
  item: Pick<LineItemForm, "productCode" | "weight" | "orderQuantity">,
  productOptions: ProductOption[],
) => {
  const unitWeight = resolveLineUnitWeight(item, productOptions);
  if (unitWeight === null) {
    return null;
  }
  const orderQuantity = Number(item.orderQuantity);
  if (!Number.isFinite(orderQuantity)) {
    return null;
  }
  return unitWeight * orderQuantity;
};

export const formatLineTotalWeight = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }
  return `${weightFormatter.format(value / 1000)} kg`;
};

export const calculateLineAmount = (item: Pick<LineItemForm, "orderQuantity" | "unitPrice">) => {
  const orderQuantity = Number(item.orderQuantity);
  const unitPrice = Number(item.unitPrice);
  if (!Number.isFinite(orderQuantity) || !Number.isFinite(unitPrice)) {
    return null;
  }
  return orderQuantity * unitPrice;
};

export const formatLineAmount = (value: number | null, currency: string) => {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }
  const formatted = lineAmountFormatter.format(value);
  return currency ? `${currency} ${formatted}` : formatted;
};

export const calculateShipmentAmount = (shipment: ShipmentForm, items: LineItemForm[]) => {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  return shipment.items.reduce((sum, entry) => {
    const lineItem = itemMap.get(entry.lineItemId);
    if (!lineItem) {
      return sum;
    }
    return sum + parseNumberInput(entry.shippedQuantity) * parseNumberInput(lineItem.unitPrice);
  }, 0);
};

export const getShipmentLatestPaidDate = (shipments: ShipmentForm[]) =>
  shipments
    .map((shipment) => shipment.paidDate.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .at(-1) ?? "";

export const getShipmentPaidAmountTotal = (shipments: ShipmentForm[]) =>
  shipments.reduce((sum, shipment) => sum + parseNumberInput(shipment.paidAmount), 0);

export const getShipmentLineTotal = (shipments: ShipmentForm[], lineItemId: number) =>
  shipments.reduce((sum, shipment) => {
    const entry = shipment.items.find((item) => item.lineItemId === lineItemId);
    return sum + (entry ? parseNumberInput(entry.shippedQuantity) : 0);
  }, 0);

export const getShipmentLineCumulativeTotal = (
  shipments: ShipmentForm[],
  shipmentId: number,
  lineItemId: number,
) => {
  let total = 0;

  for (const shipment of shipments) {
    const entry = shipment.items.find((item) => item.lineItemId === lineItemId);
    total += entry ? parseNumberInput(entry.shippedQuantity) : 0;
    if (shipment.id === shipmentId) {
      break;
    }
  }

  return total;
};

export const getInitialCreateForm = (): SalesFormState => ({
  orderNo: "",
  orderDate: getTodayString(),
  customerName: "",
  customerRegion: "",
  currency: "",
  note: "",
  status: {
    shipped: false,
    delivered: false,
    paid: false,
  },
  documentStatus: {
    orderReceived: false,
    deliverySent: false,
    invoiceSent: false,
  },
  items: [],
  shipments: [],
});

export const getInitialEditForm = (row: SalesRow | null): SalesFormState => {
  if (!row) {
    return getInitialCreateForm();
  }

  const items: LineItemForm[] = row.items.map((item) => ({
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
  }));

  const shipments: ShipmentForm[] = (row.shipments ?? []).map((shipment, shipmentIndex) => {
    const existingByLineId = new Map(shipment.items.map((entry) => [entry.lineItemId, entry]));
    return {
      id: shipment.id || shipmentIndex + 1,
      deliveryDate: shipment.deliveryDate,
      paidDate: shipment.paidDate,
      paidAmount: String(shipment.paidAmount ?? 0),
      items: items.map((item, itemIndex) => ({
        id: existingByLineId.get(item.id)?.id ?? itemIndex + 1,
        lineItemId: item.id,
        shippedQuantity: String(existingByLineId.get(item.id)?.shippedQuantity ?? 0),
      })),
    };
  });

  return {
    orderNo: row.orderNo,
    orderDate: row.orderDate,
    customerName: row.customerName,
    customerRegion: row.customerRegion,
    currency: row.currency,
    note: row.note,
    status: row.status,
    documentStatus: row.documentStatus,
    items,
    shipments,
  };
};

export const validateHeader = (form: SalesFormState) => {
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
  return nextErrors;
};

export const buildSalesOrderDraft = (
  form: SalesFormState,
  productOptions: ProductOption[],
): SalesOrderFormBuildResult => {
  const headerErrors = validateHeader(form);
  const lineErrors: Record<number, LineItemError> = {};
  const shipmentErrors: Record<number, ShipmentError> = {};
  const parsedItems: SalesLineItem[] = [];
  const itemsError = form.items.length === 0 ? "製品明細を追加してください。" : "";

  form.items.forEach((item) => {
    const hasInput = Boolean(
      item.productCode ||
        item.productName ||
        item.orderQuantity.trim() ||
        item.unitPrice.trim() ||
        item.palletCount.trim() ||
        item.stockQuantity.trim(),
    );
    if (!hasInput) {
      return;
    }

    const orderQuantityValue = item.orderQuantity.trim();
    const unitPriceValue = item.unitPrice.trim();
    const palletCountValue = item.palletCount.trim();
    const stockQuantityValue = item.stockQuantity.trim();

    const orderQuantity = orderQuantityValue ? Number(item.orderQuantity) : 0;
    const unitPrice = unitPriceValue ? Number(item.unitPrice) : 0;
    const palletCount = palletCountValue ? Number(item.palletCount) : 0;
    const stockQuantity = stockQuantityValue ? Number(item.stockQuantity) : 0;
    const unitWeight = resolveLineUnitWeight(item, productOptions);
    const totalWeight = calculateLineTotalWeight(item, productOptions) ?? 0;

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
    if (!itemError.stockQuantity && stockQuantityValue && stockQuantity < 0) {
      itemError.stockQuantity = "0以上で入力してください";
    }

    if (Object.keys(itemError).length > 0) {
      lineErrors[item.id] = itemError;
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
      weight: unitWeight,
      length: item.length,
      speed: item.speed,
      shipments: [],
    });
  });

  const itemMap = new Map(parsedItems.map((item) => [item.id, item]));

  const parsedShipments: SalesOrderShipment[] = [];

  form.shipments.forEach((shipment) => {
    const deliveryDate = shipment.deliveryDate.trim();
    const paidDate = shipment.paidDate.trim();
    const paidAmountValue = shipment.paidAmount.trim();
    const paidAmount = paidAmountValue ? Number(shipment.paidAmount) : 0;
    const allocations = shipment.items
      .map((entry, index) => {
        const shippedQuantityValue = entry.shippedQuantity.trim();
        const shippedQuantity = shippedQuantityValue ? Number(entry.shippedQuantity) : 0;
        return {
          id: entry.id || index + 1,
          lineItemId: entry.lineItemId,
          shippedQuantityValue,
          shippedQuantity,
        };
      })
      .filter((entry) => itemMap.has(entry.lineItemId));

    const hasPositiveShipmentQuantity = allocations.some((entry) => entry.shippedQuantity > 0);
    const hasValue = Boolean(deliveryDate || paidDate || paidAmountValue || hasPositiveShipmentQuantity);
    if (!hasValue) {
      return;
    }

    const shipmentError: ShipmentError = {};
    if (!deliveryDate) {
      shipmentError.deliveryDate = "出荷日を入力してください";
    }
    if (paidAmountValue && Number.isNaN(paidAmount)) {
      shipmentError.paidAmount = "数値で入力してください";
    }
    if (!shipmentError.paidAmount && paidAmount < 0) {
      shipmentError.paidAmount = "0以上で入力してください";
    }
    if (paidAmount > 0 && !paidDate) {
      shipmentError.paidDate = "入金日を入力してください";
    }

    allocations.forEach((entry) => {
      const entryError: ShipmentLineError = {};
      if (entry.shippedQuantityValue && Number.isNaN(entry.shippedQuantity)) {
        entryError.shippedQuantity = "数値で入力してください";
      }
      if (!entryError.shippedQuantity && entry.shippedQuantity < 0) {
        entryError.shippedQuantity = "0以上で入力してください";
      }
      if (Object.keys(entryError).length > 0) {
        shipmentError.items = {
          ...(shipmentError.items ?? {}),
          [entry.lineItemId]: entryError,
        };
      }
    });

    if (Object.keys(shipmentError).length > 0) {
      shipmentErrors[shipment.id] = shipmentError;
      return;
    }

    parsedShipments.push({
      id: shipment.id,
      deliveryDate,
      paidDate,
      paidAmount,
      items: allocations
        .filter((entry) => entry.shippedQuantity > 0)
        .map((entry, index) => ({
          id: index + 1,
          lineItemId: entry.lineItemId,
          shippedQuantity: entry.shippedQuantity,
        })),
    });
  });

  parsedItems.forEach((item) => {
    const totalShippedQuantity = parsedShipments.reduce((sum, shipment) => {
      const allocation = shipment.items.find((entry) => entry.lineItemId === item.id);
      return sum + (allocation?.shippedQuantity ?? 0);
    }, 0);
    if (totalShippedQuantity > item.orderQuantity) {
      lineErrors[item.id] = {
        ...(lineErrors[item.id] ?? {}),
        shipmentTotal: "出荷数合計は注数以下で入力してください",
      };
    }
  });

  const hasHeaderError = Object.values(headerErrors).some(Boolean);
  if (hasHeaderError || itemsError || Object.keys(lineErrors).length > 0 || Object.keys(shipmentErrors).length > 0) {
    return {
      ok: false,
      headerErrors,
      lineErrors,
      shipmentErrors,
      itemsError,
      actionError: "入力内容をご確認ください。",
    };
  }

  const itemsWithShipments = applyOrderShipmentsToLineItems(parsedItems, parsedShipments);
  const totalPaidAmount = parsedShipments.reduce((sum, shipment) => sum + shipment.paidAmount, 0);
  const latestPaidDate =
    parsedShipments
      .map((shipment) => shipment.paidDate)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .at(-1) ?? "";
  const primaryDeliveryDate =
    parsedShipments
      .filter((shipment) => shipment.items.length > 0)
      .map((shipment) => shipment.deliveryDate)
      .sort((a, b) => a.localeCompare(b))[0] ?? "";

  return {
    ok: true,
    value: {
      orderNo: form.orderNo.trim(),
      orderDate: form.orderDate,
      customerName: form.customerName,
      customerRegion: form.customerRegion,
      deliveryDate: primaryDeliveryDate,
      paidAmount: totalPaidAmount,
      paidDate: latestPaidDate,
      currency: form.currency,
      note: form.note,
      items: itemsWithShipments,
      shipments: parsedShipments,
      status: form.status,
      documentStatus: form.documentStatus,
    },
  };
};

export const getSalesOrderFormSummary = (form: SalesFormState) => {
  const orderQuantity = form.items.reduce((sum, item) => sum + parseNumberInput(item.orderQuantity), 0);
  const shippedQuantity = form.shipments.reduce(
    (sum, shipment) =>
      sum + shipment.items.reduce((shipmentSum, entry) => shipmentSum + parseNumberInput(entry.shippedQuantity), 0),
    0,
  );
  const orderAmount = form.items.reduce((sum, item) => sum + (calculateLineAmount(item) ?? 0), 0);
  const shippedAmount = form.shipments.reduce((sum, shipment) => sum + calculateShipmentAmount(shipment, form.items), 0);
  const paidAmount = getShipmentPaidAmountTotal(form.shipments);
  const latestPaidDate = getShipmentLatestPaidDate(form.shipments);

  return {
    orderQuantity,
    shippedQuantity,
    orderAmount,
    shippedAmount,
    paidAmount,
    latestPaidDate,
    orderBalance: Math.max(orderAmount - paidAmount, 0),
    receivableBalance: Math.max(shippedAmount - paidAmount, 0),
    unshippedAmount: Math.max(orderAmount - shippedAmount, 0),
    itemCount: form.items.length,
    shipmentCount: form.shipments.length,
  };
};

export const buildShipmentDisplayRows = (shipment: ShipmentForm, items: LineItemForm[]) => {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  return shipment.items.map((entry) => {
    const item = itemMap.get(entry.lineItemId);
    return {
      lineItemId: entry.lineItemId,
      shippedQuantity: parseNumberInput(entry.shippedQuantity),
      label: item ? `${item.productCode || "-"} ${item.productName || ""}`.trim() : "-",
      orderQuantity: item ? parseNumberInput(item.orderQuantity) : 0,
      amount: item ? parseNumberInput(entry.shippedQuantity) * parseNumberInput(item.unitPrice) : 0,
    };
  });
};
