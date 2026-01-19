import { getIdTokenJwt } from "@/lib/auth/cognito";
import {
  salesDocumentStatusOptions,
  salesStatusOptions,
  type NewSalesOrderInput,
  type SalesDocumentStatus,
  type SalesLineItem,
  type SalesOrderItem,
  type SalesRow,
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

const normalizeItems = (items: unknown): SalesLineItem[] => {
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
        shippedQuantity: 0,
        unitPrice: 0,
        weight: null,
        length: null,
        speed: null,
      };
    }
    const record = item as Record<string, unknown>;
    return {
      id: typeof record.id === "number" ? record.id : index + 1,
      productCode: typeof record.productCode === "string" ? record.productCode : "",
      productName: typeof record.productName === "string" ? record.productName : "",
      materials: normalizeMaterials(record.materials),
      stockQuantity: normalizeNullableNumber(record.stockQuantity),
      orderQuantity: normalizeNumber(record.orderQuantity),
      shippedQuantity: normalizeNumber(record.shippedQuantity),
      unitPrice: normalizeNumber(record.unitPrice),
      weight: normalizeNullableNumber(record.weight),
      length: normalizeNullableNumber(record.length),
      speed: normalizeNullableNumber(record.speed),
    };
  });
};

function toRow(item: SalesOrderItem): SalesRow {
  const items = normalizeItems(item.items);
  const id = Number(item.displayNo ?? 0);
  return {
    id,
    salesOrderId: item.salesOrderId,
    orderNo: item.orderNo ?? "",
    orderDate: item.orderDate ?? "",
    customerName: item.customerName ?? "",
    customerRegion: item.customerRegion ?? "",
    deliveryDate: item.deliveryDate ?? "",
    currency: item.currency ?? "",
    note: item.note ?? "",
    items,
    status: normalizeStatus(item.status),
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
