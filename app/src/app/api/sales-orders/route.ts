import { NextResponse } from "next/server";
import { verifyCognitoIdToken } from "@/lib/auth/verifyCognitoIdToken";
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

    const items = await listSalesOrders(orgId);
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list sales orders" }, { status: 500 });
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
    if (!isNewSalesOrderInput(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const saved = await upsertSalesOrder(orgId, bodyUnknown);
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create sales order" }, { status: 500 });
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
    if (!isUpdateSalesOrderInput(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const saved = await upsertSalesOrder(orgId, bodyUnknown);
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
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
  try {
    const orgIdOrRes = await requireOrgId(req);
    if (orgIdOrRes instanceof NextResponse) {
      return orgIdOrRes;
    }
    const orgId = orgIdOrRes;

    const bodyUnknown: unknown = await req.json();
    if (!isDeleteSalesOrderBody(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    await deleteSalesOrder(orgId, bodyUnknown.salesOrderId);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete sales order" }, { status: 500 });
  }
}
