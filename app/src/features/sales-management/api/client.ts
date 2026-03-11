import { getIdTokenJwt } from "@/lib/auth/cognito";
import { getPrimaryDeliveryDate } from "@/features/sales-management/salesManagementUtils";
import {
  salesDocumentStatusOptions,
  salesStatusOptions,
  type NewSalesOrderInput,
  type SalesDocumentStatus,
  type SalesLineItem,
  type SalesOrderItem,
  type SalesRow,
  type SalesShipment,
  type SalesStatus,
  type UpdateSalesOrderInput,
} from "../types";

async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = await getIdTokenJwt();
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, { ...init, headers });
}

const salesStatusKeys = salesStatusOptions.map((option) => option.key);
const documentStatusKeys = salesDocumentStatusOptions.map((option) => option.key);

const normalizeStatus = (value: Partial<SalesStatus> | undefined): SalesStatus =>
  salesStatusKeys.reduce((acc, key) => {
    acc[key] = Boolean(value?.[key]);
    return acc;
  }, {} as SalesStatus);

const normalizeDocumentStatus = (value: Partial<SalesDocumentStatus> | undefined): SalesDocumentStatus =>
  documentStatusKeys.reduce((acc, key) => {
    acc[key] = Boolean(value?.[key]);
    return acc;
  }, {} as SalesDocumentStatus);

const normalizeMaterials = (materials: unknown): string[] => {
  if (!Array.isArray(materials)) {
    return [];
  }
  return materials.filter((item): item is string => typeof item === "string");
};

const normalizeNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const normalizeNullableNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const normalizeShipments = (
  shipments: unknown,
  fallbackDeliveryDate = "",
  legacyShippedQuantity: unknown = 0,
): SalesShipment[] => {
  const fallbackDate = normalizeString(fallbackDeliveryDate);

  if (Array.isArray(shipments)) {
    return shipments.map((shipment, index) => {
      if (!shipment || typeof shipment !== "object") {
        return {
          id: index + 1,
          deliveryDate: fallbackDate,
          shippedQuantity: 0,
        };
      }

      const record = shipment as Record<string, unknown>;
      return {
        id: typeof record.id === "number" ? record.id : index + 1,
        deliveryDate: normalizeString(record.deliveryDate) || fallbackDate,
        shippedQuantity: normalizeNumber(record.shippedQuantity),
      };
    });
  }

  const legacyDate = fallbackDate;
  const shippedQuantity = normalizeNumber(legacyShippedQuantity);
  if (!legacyDate && shippedQuantity <= 0) {
    return [];
  }

  return [
    {
      id: 1,
      deliveryDate: legacyDate,
      shippedQuantity,
    },
  ];
};

const normalizeItems = (items: unknown, fallbackDeliveryDate = ""): SalesLineItem[] => {
  const fallbackDate = normalizeString(fallbackDeliveryDate);
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item, index) => {
    if (!item || typeof item !== "object") {
      return {
        id: index + 1,
        productCode: "",
        productName: "",
        materials: [],
        stockQuantity: null,
        orderQuantity: 0,
        unitPrice: 0,
        palletCount: 0,
        totalWeight: 0,
        weight: null,
        length: null,
        speed: null,
        shipments: normalizeShipments([], fallbackDate, 0),
      };
    }
    const record = item as Record<string, unknown>;
    return {
      id: typeof record.id === "number" ? record.id : index + 1,
      productCode: normalizeString(record.productCode),
      productName: normalizeString(record.productName),
      materials: normalizeMaterials(record.materials),
      stockQuantity: normalizeNullableNumber(record.stockQuantity),
      orderQuantity: normalizeNumber(record.orderQuantity),
      unitPrice: normalizeNumber(record.unitPrice),
      palletCount: normalizeNumber(record.palletCount),
      totalWeight: normalizeNumber(record.totalWeight),
      weight: normalizeNullableNumber(record.weight),
      length: normalizeNullableNumber(record.length),
      speed: normalizeNullableNumber(record.speed),
      shipments: normalizeShipments(record.shipments, normalizeString(record.deliveryDate) || fallbackDate, record.shippedQuantity),
    };
  });
};

function toRow(item: SalesOrderItem): SalesRow {
  const status = normalizeStatus(item.status);
  const fallbackDeliveryDate = normalizeString(item.deliveryDate);
  const items = normalizeItems(item.items, fallbackDeliveryDate);
  const orderAmount = items.reduce((sum, line) => sum + line.orderQuantity * line.unitPrice, 0);
  const paidAmount =
    typeof item.paidAmount === "number" && Number.isFinite(item.paidAmount)
      ? item.paidAmount
      : status.paid
        ? orderAmount
        : 0;
  const id = Number(item.displayNo ?? 0);
  return {
    id,
    salesOrderId: item.salesOrderId,
    orderNo: normalizeString(item.orderNo),
    orderDate: normalizeString(item.orderDate),
    customerName: normalizeString(item.customerName),
    customerRegion: normalizeString(item.customerRegion),
    deliveryDate: fallbackDeliveryDate || getPrimaryDeliveryDate(items),
    paidAmount,
    paidDate: normalizeString(item.paidDate),
    currency: normalizeString(item.currency),
    note: normalizeString(item.note),
    items,
    status,
    documentStatus: normalizeDocumentStatus(item.documentStatus),
  };
}

export async function fetchSalesOrderRows(): Promise<SalesRow[]> {
  const res = await authFetch("/api/sales-orders", { method: "GET" });
  if (!res.ok) {
    throw new Error("Failed to fetch sales orders");
  }
  const items = (await res.json()) as SalesOrderItem[];
  const rows = items.map(toRow);
  rows.sort((a, b) => (a.id || Number.MAX_SAFE_INTEGER) - (b.id || Number.MAX_SAFE_INTEGER));
  return rows;
}

export async function createSalesOrder(input: NewSalesOrderInput): Promise<SalesOrderItem> {
  const res = await authFetch("/api/sales-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to create sales order: ${res.status} ${text}`);
  }
  return (await res.json()) as SalesOrderItem;
}

const toUpdatePayload = (row: SalesRow): UpdateSalesOrderInput => ({
  salesOrderId: row.salesOrderId,
  orderNo: row.orderNo,
  orderDate: row.orderDate,
  customerName: row.customerName,
  customerRegion: row.customerRegion,
  deliveryDate: row.deliveryDate,
  paidAmount: row.paidAmount,
  paidDate: row.paidDate,
  currency: row.currency,
  note: row.note,
  items: row.items,
  status: row.status,
  documentStatus: row.documentStatus,
});

export async function updateSalesOrder(row: SalesRow): Promise<void> {
  const res = await authFetch("/api/sales-orders", {
    method: "PUT",
    body: JSON.stringify(toUpdatePayload(row)),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to update sales order: ${res.status} ${text}`);
  }
}

export async function deleteSalesOrder(salesOrderId: string): Promise<void> {
  const res = await authFetch("/api/sales-orders", {
    method: "DELETE",
    body: JSON.stringify({ salesOrderId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to delete sales order: ${res.status} ${text}`);
  }
}
