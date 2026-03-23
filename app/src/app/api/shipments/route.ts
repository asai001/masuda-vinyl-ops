import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireAuthContext } from "@/lib/auth/requireAuthContext";
import {
  createShipment,
  deleteShipment,
  listShipmentItems,
  updateShipment,
} from "@/features/shipment-management/api/server";
import type { NewShipmentInput, ShipmentAllocation, UpdateShipmentInput } from "@/features/shipment-management/types";

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isOptionalString = (value: unknown): value is string | undefined => value === undefined || typeof value === "string";
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isIsoDate = (value: unknown): value is string =>
  isNonEmptyString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) && !Number.isNaN(Date.parse(value.trim()));

const isShipmentAllocation = (value: unknown): value is ShipmentAllocation => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isFiniteNumber(record.id) &&
    isNonEmptyString(record.salesOrderId) &&
    isFiniteNumber(record.lineItemId) &&
    isFiniteNumber(record.shippedQuantity)
  );
};

function isNewShipmentInput(value: unknown): value is NewShipmentInput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isIsoDate(record.deliveryDate) &&
    isOptionalString(record.invoiceNo) &&
    isOptionalString(record.paidDate) &&
    (record.paidDate === undefined || record.paidDate === "" || isIsoDate(record.paidDate)) &&
    (record.paidAmount === undefined || isFiniteNumber(record.paidAmount)) &&
    isOptionalString(record.note) &&
    Array.isArray(record.allocations) &&
    record.allocations.every(isShipmentAllocation)
  );
}

function isUpdateShipmentInput(value: unknown): value is UpdateShipmentInput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return isNonEmptyString(record.shipmentId) && isNewShipmentInput(record);
}

function isDeleteShipmentBody(value: unknown): value is { shipmentId: string } {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return isNonEmptyString(record.shipmentId);
}

const resource = "shipments";

const toShipmentTarget = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return {
    shipmentId: typeof record.shipmentId === "string" ? record.shipmentId : undefined,
    deliveryDate: typeof record.deliveryDate === "string" ? record.deliveryDate : undefined,
  };
};

export async function GET(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "shipments.list";
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
    const items = await listShipmentItems(orgId);
    await writeAuditLog({ req, orgId, actor, action, resource, result: "success", statusCode: 200 });
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list shipments";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      result: "failure",
      statusCode: 500,
      errorMessage: message,
    });
    console.error(error);
    return NextResponse.json({ error: "Failed to list shipments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "shipments.create";
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

  if (!isNewShipmentInput(bodyUnknown)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toShipmentTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const saved = await createShipment(orgId, bodyUnknown);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { shipmentId: saved.shipmentId, shipmentNo: saved.shipmentNo },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create shipment";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toShipmentTarget(bodyUnknown),
      result: "failure",
      statusCode: 500,
      errorMessage: message,
    });
    console.error(error);
    return NextResponse.json({ error: "Failed to create shipment" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "shipments.update";
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

  if (!isUpdateShipmentInput(bodyUnknown)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toShipmentTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const saved = await updateShipment(orgId, bodyUnknown);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { shipmentId: saved.shipmentId, shipmentNo: saved.shipmentNo },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update shipment";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toShipmentTarget(bodyUnknown),
      result: "failure",
      statusCode: 500,
      errorMessage: message,
    });
    console.error(error);
    return NextResponse.json({ error: "Failed to update shipment" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "shipments.delete";
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

  if (!isDeleteShipmentBody(bodyUnknown)) {
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
    await deleteShipment(orgId, bodyUnknown.shipmentId);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { shipmentId: bodyUnknown.shipmentId },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete shipment";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { shipmentId: (bodyUnknown as { shipmentId?: string }).shipmentId },
      result: "failure",
      statusCode: 500,
      errorMessage: message,
    });
    console.error(error);
    return NextResponse.json({ error: "Failed to delete shipment" }, { status: 500 });
  }
}
