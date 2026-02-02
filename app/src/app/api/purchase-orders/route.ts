import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireAuthContext } from "@/lib/auth/requireAuthContext";
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

const resource = "purchase-orders";

const toPurchaseOrderTarget = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return {
    purchaseOrderId: typeof record.purchaseOrderId === "string" ? record.purchaseOrderId : undefined,
    supplier: typeof record.supplier === "string" ? record.supplier : undefined,
  };
};

export async function GET(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "purchase-orders.list";
  if (!auth.ok) {
    await writeAuditLog({
      req,
      actor: auth.actor,
      action,
      resource,
      result: "failure",
      statusCode: auth.status,
      errorMessage: auth.error,
    });
    return auth.response;
  }
  const { orgId, actor } = auth;
  try {
    const items = await listPurchaseOrders(orgId);
    await writeAuditLog({ req, orgId, actor, action, resource, result: "success", statusCode: 200 });
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list purchase orders";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to list purchase orders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "purchase-orders.create";
  if (!auth.ok) {
    await writeAuditLog({
      req,
      actor: auth.actor,
      action,
      resource,
      result: "failure",
      statusCode: auth.status,
      errorMessage: auth.error,
    });
    return auth.response;
  }
  const { orgId, actor } = auth;
  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json();
  } catch {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isNewPurchaseOrderInput(bodyUnknown)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toPurchaseOrderTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const saved = await upsertPurchaseOrder(orgId, bodyUnknown);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { purchaseOrderId: saved.purchaseOrderId, supplier: saved.supplier },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create purchase order";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toPurchaseOrderTarget(bodyUnknown),
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "purchase-orders.update";
  if (!auth.ok) {
    await writeAuditLog({
      req,
      actor: auth.actor,
      action,
      resource,
      result: "failure",
      statusCode: auth.status,
      errorMessage: auth.error,
    });
    return auth.response;
  }
  const { orgId, actor } = auth;
  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json();
  } catch {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isUpdatePurchaseOrderInput(bodyUnknown)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toPurchaseOrderTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const saved = await upsertPurchaseOrder(orgId, bodyUnknown);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { purchaseOrderId: saved.purchaseOrderId, supplier: saved.supplier },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update purchase order";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toPurchaseOrderTarget(bodyUnknown),
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
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
  const auth = await requireAuthContext(req);
  const action = "purchase-orders.delete";
  if (!auth.ok) {
    await writeAuditLog({
      req,
      actor: auth.actor,
      action,
      resource,
      result: "failure",
      statusCode: auth.status,
      errorMessage: auth.error,
    });
    return auth.response;
  }
  const { orgId, actor } = auth;
  let bodyUnknown: unknown;
  try {
    bodyUnknown = await req.json();
  } catch {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isDeletePurchaseOrderBody(bodyUnknown)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    await deletePurchaseOrder(orgId, bodyUnknown.purchaseOrderId);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { purchaseOrderId: bodyUnknown.purchaseOrderId },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete purchase order";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { purchaseOrderId: (bodyUnknown as { purchaseOrderId?: string }).purchaseOrderId },
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to delete purchase order" }, { status: 500 });
  }
}
