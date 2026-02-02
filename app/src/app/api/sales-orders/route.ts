import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireAuthContext } from "@/lib/auth/requireAuthContext";
import { deleteSalesOrder, listSalesOrders, upsertSalesOrder } from "@/features/sales-management/api/server";
import {
  salesDocumentStatusOptions,
  salesStatusOptions,
  type NewSalesOrderInput,
  type SalesDocumentStatusKey,
  type SalesLineItem,
  type SalesStatusKey,
  type UpdateSalesOrderInput,
} from "@/features/sales-management/types";

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isOptionalString = (v: unknown): v is string | undefined => v === undefined || typeof v === "string";
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isNumberOrNull = (v: unknown): v is number | null => v === null || isFiniteNumber(v);
const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((item) => typeof item === "string");

const salesStatusKeys = salesStatusOptions.map((option) => option.key);
const documentStatusKeys = salesDocumentStatusOptions.map((option) => option.key);

const isSalesStatus = (value: unknown): value is Record<SalesStatusKey, boolean> => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return salesStatusKeys.every((key) => typeof record[key] === "boolean");
};

const isDocumentStatus = (value: unknown): value is Record<SalesDocumentStatusKey, boolean> => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return documentStatusKeys.every((key) => typeof record[key] === "boolean");
};

const isSalesLineItem = (value: unknown): value is SalesLineItem => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isFiniteNumber(record.id) &&
    isNonEmptyString(record.productCode) &&
    isNonEmptyString(record.productName) &&
    isStringArray(record.materials) &&
    isNumberOrNull(record.stockQuantity) &&
    isFiniteNumber(record.orderQuantity) &&
    isFiniteNumber(record.shippedQuantity) &&
    isFiniteNumber(record.unitPrice) &&
    isFiniteNumber(record.palletCount) &&
    isFiniteNumber(record.totalWeight) &&
    isNumberOrNull(record.weight) &&
    isNumberOrNull(record.length) &&
    isNumberOrNull(record.speed)
  );
};

const isSalesLineItems = (value: unknown): value is SalesLineItem[] =>
  Array.isArray(value) && value.length > 0 && value.every(isSalesLineItem);

function isNewSalesOrderInput(value: unknown): value is NewSalesOrderInput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isNonEmptyString(record.orderNo) &&
    isNonEmptyString(record.orderDate) &&
    isNonEmptyString(record.deliveryDate) &&
    isNonEmptyString(record.customerName) &&
    typeof record.customerRegion === "string" &&
    isNonEmptyString(record.currency) &&
    isOptionalString(record.note) &&
    isSalesLineItems(record.items) &&
    isSalesStatus(record.status) &&
    isDocumentStatus(record.documentStatus)
  );
}

function isUpdateSalesOrderInput(value: unknown): value is UpdateSalesOrderInput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return isNonEmptyString(record.salesOrderId) && isNewSalesOrderInput(record);
}

const resource = "sales-orders";

const toSalesOrderTarget = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return {
    salesOrderId: typeof record.salesOrderId === "string" ? record.salesOrderId : undefined,
    orderNo: typeof record.orderNo === "string" ? record.orderNo : undefined,
    customerName: typeof record.customerName === "string" ? record.customerName : undefined,
  };
};

export async function GET(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "sales-orders.list";
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
    const items = await listSalesOrders(orgId);
    await writeAuditLog({ req, orgId, actor, action, resource, result: "success", statusCode: 200 });
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list sales orders";
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
    return NextResponse.json({ error: "Failed to list sales orders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "sales-orders.create";
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

  if (!isNewSalesOrderInput(bodyUnknown)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toSalesOrderTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const saved = await upsertSalesOrder(orgId, bodyUnknown);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { salesOrderId: saved.salesOrderId, orderNo: saved.orderNo },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create sales order";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toSalesOrderTarget(bodyUnknown),
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to create sales order" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "sales-orders.update";
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

  if (!isUpdateSalesOrderInput(bodyUnknown)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toSalesOrderTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const saved = await upsertSalesOrder(orgId, bodyUnknown);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { salesOrderId: saved.salesOrderId, orderNo: saved.orderNo },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update sales order";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toSalesOrderTarget(bodyUnknown),
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to update sales order" }, { status: 500 });
  }
}

function isDeleteSalesOrderBody(value: unknown): value is { salesOrderId: string } {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return isNonEmptyString(record.salesOrderId);
}

export async function DELETE(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "sales-orders.delete";
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

  if (!isDeleteSalesOrderBody(bodyUnknown)) {
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
    await deleteSalesOrder(orgId, bodyUnknown.salesOrderId);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { salesOrderId: bodyUnknown.salesOrderId },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete sales order";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { salesOrderId: (bodyUnknown as { salesOrderId?: string }).salesOrderId },
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to delete sales order" }, { status: 500 });
  }
}
