import { getIdTokenJwt } from "@/lib/auth/cognito";
import {
  documentStatusOptions,
  orderStatusOptions,
  type DocumentStatus,
  type OrderLineItem,
  type OrderRow,
  type OrderStatus,
  type PurchaseOrderItem,
  type NewPurchaseOrderInput,
  type UpdatePurchaseOrderInput,
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

const orderStatusKeys = orderStatusOptions.map((option) => option.key);
const documentStatusKeys = documentStatusOptions.map((option) => option.key);

const normalizeStatus = (value: Partial<OrderStatus> | undefined): OrderStatus =>
  orderStatusKeys.reduce((acc, key) => {
    acc[key] = Boolean(value?.[key]);
    return acc;
  }, {} as OrderStatus);

const normalizeDocumentStatus = (value: Partial<DocumentStatus> | undefined): DocumentStatus =>
  documentStatusKeys.reduce((acc, key) => {
    acc[key] = Boolean(value?.[key]);
    return acc;
  }, {} as DocumentStatus);

const normalizeItems = (items: unknown): OrderLineItem[] => {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item, index) => {
    if (!item || typeof item !== "object") {
      return { id: index + 1, itemCode: "", itemName: "", unit: "", quantity: 0, unitPrice: 0 };
    }
    const record = item as Record<string, unknown>;
    return {
      id: typeof record.id === "number" ? record.id : index + 1,
      itemCode: typeof record.itemCode === "string" ? record.itemCode : "",
      itemName: typeof record.itemName === "string" ? record.itemName : "",
      unit: typeof record.unit === "string" ? record.unit : "",
      quantity: typeof record.quantity === "number" ? record.quantity : 0,
      unitPrice: typeof record.unitPrice === "number" ? record.unitPrice : 0,
    };
  });
};

const calculateAmount = (items: OrderLineItem[]) => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

function toRow(item: PurchaseOrderItem): OrderRow {
  const items = normalizeItems(item.items);
  const amount = typeof item.amount === "number" ? item.amount : calculateAmount(items);
  const id = Number(item.displayNo ?? 0);
  return {
    id,
    purchaseOrderId: item.purchaseOrderId,
    orderDate: item.orderDate ?? "",
    deliveryDate: item.deliveryDate ?? "",
    supplier: item.supplier ?? "",
    items,
    currency: item.currency ?? "",
    amount,
    note: item.note ?? "",
    status: normalizeStatus(item.status),
    documentStatus: normalizeDocumentStatus(item.documentStatus),
  };
}

export async function fetchPurchaseOrderRows(): Promise<OrderRow[]> {
  const res = await authFetch("/api/purchase-orders", { method: "GET" });
  if (!res.ok) {
    throw new Error("Failed to fetch purchase orders");
  }
  const items = (await res.json()) as PurchaseOrderItem[];
  const rows = items.map(toRow);
  rows.sort((a, b) => (a.id || Number.MAX_SAFE_INTEGER) - (b.id || Number.MAX_SAFE_INTEGER));
  return rows;
}

export async function createPurchaseOrder(input: NewPurchaseOrderInput): Promise<PurchaseOrderItem> {
  const res = await authFetch("/api/purchase-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to create purchase order: ${res.status} ${text}`);
  }
  return (await res.json()) as PurchaseOrderItem;
}

const toUpdatePayload = (row: OrderRow): UpdatePurchaseOrderInput => ({
  purchaseOrderId: row.purchaseOrderId,
  orderDate: row.orderDate,
  deliveryDate: row.deliveryDate,
  supplier: row.supplier,
  items: row.items,
  currency: row.currency,
  amount: row.amount,
  note: row.note,
  status: row.status,
  documentStatus: row.documentStatus,
});

export async function updatePurchaseOrder(row: OrderRow): Promise<void> {
  const res = await authFetch("/api/purchase-orders", {
    method: "PUT",
    body: JSON.stringify(toUpdatePayload(row)),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to update purchase order: ${res.status} ${text}`);
  }
}

export async function deletePurchaseOrder(purchaseOrderId: string): Promise<void> {
  const res = await authFetch("/api/purchase-orders", {
    method: "DELETE",
    body: JSON.stringify({ purchaseOrderId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to delete purchase order: ${res.status} ${text}`);
  }
}
