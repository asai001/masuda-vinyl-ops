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
  type OrderLineItem,
  type OrderPayment,
  type OrderStatusKey,
  type PurchaseOrderItem,
} from "@/features/order-management/types";

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isOptionalString = (v: unknown): v is string | undefined => v === undefined || typeof v === "string";
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isOptionalFiniteNumber = (v: unknown): v is number | undefined => v === undefined || isFiniteNumber(v);

const orderStatusKeys = orderStatusOptions.map((option) => option.key);
const documentStatusKeys = documentStatusOptions.map((option) => option.key);

const isOrderStatus = (value: unknown): value is Partial<Record<OrderStatusKey, boolean>> => {
  if (value === undefined) {
    return true;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return orderStatusKeys.every((key) => record[key] === undefined || typeof record[key] === "boolean");
};

const isDocumentStatus = (value: unknown): value is Partial<Record<DocumentStatusKey, boolean>> => {
  if (value === undefined) {
    return true;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return documentStatusKeys.every((key) => record[key] === undefined || typeof record[key] === "boolean");
};

const isOrderLineItem = (value: unknown): value is Partial<OrderLineItem> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    (record.id === undefined || isFiniteNumber(record.id)) &&
    isOptionalString(record.itemCode) &&
    isOptionalString(record.itemName) &&
    isOptionalString(record.unit) &&
    isOptionalFiniteNumber(record.quantity) &&
    isOptionalFiniteNumber(record.unitPrice)
  );
};

const isOrderLineItems = (value: unknown): value is Partial<OrderLineItem>[] =>
  value === undefined || (Array.isArray(value) && value.every(isOrderLineItem));

const isOrderPayment = (value: unknown): value is Partial<OrderPayment> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    (record.id === undefined || isFiniteNumber(record.id)) &&
    isOptionalString(record.paymentDate) &&
    isOptionalFiniteNumber(record.amount) &&
    isOptionalString(record.note)
  );
};

const isOrderPayments = (value: unknown): value is Partial<OrderPayment>[] =>
  value === undefined || (Array.isArray(value) && value.every(isOrderPayment));

const isPurchaseOrderPayload = (value: unknown): value is Partial<PurchaseOrderItem> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isOptionalString(record.orderDate) &&
    isOptionalString(record.deliveryDate) &&
    isOptionalString(record.supplier) &&
    isOptionalString(record.currency) &&
    isOptionalString(record.poNo) &&
    isOptionalFiniteNumber(record.amount) &&
    isOptionalString(record.note) &&
    isOrderLineItems(record.items) &&
    isOrderPayments(record.payments) &&
    isOrderStatus(record.status) &&
    isDocumentStatus(record.documentStatus)
  );
};

function isUpdatePurchaseOrderInput(value: unknown): value is Partial<PurchaseOrderItem> & { purchaseOrderId: string } {
  if (!isPurchaseOrderPayload(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return isNonEmptyString(record.purchaseOrderId);
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

  if (!isPurchaseOrderPayload(bodyUnknown)) {
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
