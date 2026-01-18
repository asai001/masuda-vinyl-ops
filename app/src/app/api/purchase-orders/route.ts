import { NextResponse } from "next/server";
import { verifyCognitoIdToken } from "@/lib/auth/verifyCognitoIdToken";
import {
  deletePurchaseOrder,
  listPurchaseOrders,
  upsertPurchaseOrder,
} from "@/features/order-management/api/server";
import {
  documentStatusOptions,
  orderStatusOptions,
  type DocumentStatusKey,
  type NewPurchaseOrderInput,
  type OrderLineItem,
  type OrderStatusKey,
  type UpdatePurchaseOrderInput,
} from "@/features/order-management/types";

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isOptionalString = (v: unknown): v is string | undefined => v === undefined || typeof v === "string";
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const orderStatusKeys = orderStatusOptions.map((option) => option.key);
const documentStatusKeys = documentStatusOptions.map((option) => option.key);

const isOrderStatus = (value: unknown): value is Record<OrderStatusKey, boolean> => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return orderStatusKeys.every((key) => typeof record[key] === "boolean");
};

const isDocumentStatus = (value: unknown): value is Record<DocumentStatusKey, boolean> => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return documentStatusKeys.every((key) => typeof record[key] === "boolean");
};

const isOrderLineItem = (value: unknown): value is OrderLineItem => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isFiniteNumber(record.id) &&
    isNonEmptyString(record.itemCode) &&
    isNonEmptyString(record.itemName) &&
    typeof record.unit === "string" &&
    isFiniteNumber(record.quantity) &&
    isFiniteNumber(record.unitPrice)
  );
};

const isOrderLineItems = (value: unknown): value is OrderLineItem[] =>
  Array.isArray(value) && value.length > 0 && value.every(isOrderLineItem);

function isNewPurchaseOrderInput(value: unknown): value is NewPurchaseOrderInput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isNonEmptyString(record.orderDate) &&
    isNonEmptyString(record.deliveryDate) &&
    isNonEmptyString(record.supplier) &&
    isNonEmptyString(record.currency) &&
    isFiniteNumber(record.amount) &&
    isOptionalString(record.note) &&
    isOrderLineItems(record.items) &&
    isOrderStatus(record.status) &&
    isDocumentStatus(record.documentStatus)
  );
}

function isUpdatePurchaseOrderInput(value: unknown): value is UpdatePurchaseOrderInput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return isNonEmptyString(record.purchaseOrderId) && isNewPurchaseOrderInput(record);
}

function getBearer(req: Request) {
  const v = req.headers.get("authorization") ?? "";
  const m = v.match(/^Bearer\s+(.+)$/i);
  return m?.[1];
}

async function requireOrgId(req: Request): Promise<string | NextResponse> {
  const token = getBearer(req);
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const payload = await verifyCognitoIdToken(token);
  const orgId = String(payload["custom:orgId"] ?? "");
  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId claim" }, { status: 403 });
  }
  return orgId;
}

export async function GET(req: Request) {
  try {
    const orgIdOrRes = await requireOrgId(req);
    if (orgIdOrRes instanceof NextResponse) {
      return orgIdOrRes;
    }
    const orgId = orgIdOrRes;

    const items = await listPurchaseOrders(orgId);
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list purchase orders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const orgIdOrRes = await requireOrgId(req);
    if (orgIdOrRes instanceof NextResponse) {
      return orgIdOrRes;
    }
    const orgId = orgIdOrRes;

    const bodyUnknown: unknown = await req.json();
    if (!isNewPurchaseOrderInput(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const saved = await upsertPurchaseOrder(orgId, bodyUnknown);
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const orgIdOrRes = await requireOrgId(req);
    if (orgIdOrRes instanceof NextResponse) {
      return orgIdOrRes;
    }
    const orgId = orgIdOrRes;

    const bodyUnknown: unknown = await req.json();
    if (!isUpdatePurchaseOrderInput(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const saved = await upsertPurchaseOrder(orgId, bodyUnknown);
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update purchase order" }, { status: 500 });
  }
}

function isDeletePurchaseOrderBody(value: unknown): value is { purchaseOrderId: string } {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return isNonEmptyString(record.purchaseOrderId);
}

export async function DELETE(req: Request) {
  try {
    const orgIdOrRes = await requireOrgId(req);
    if (orgIdOrRes instanceof NextResponse) {
      return orgIdOrRes;
    }
    const orgId = orgIdOrRes;

    const bodyUnknown: unknown = await req.json();
    if (!isDeletePurchaseOrderBody(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    await deletePurchaseOrder(orgId, bodyUnknown.purchaseOrderId);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete purchase order" }, { status: 500 });
  }
}
