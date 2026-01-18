import { NextResponse } from "next/server";
import { verifyCognitoIdToken } from "@/lib/auth/verifyCognitoIdToken";
import { deleteProduct, listProducts, upsertProduct } from "@/features/product-master/api/server";
import type { NewProductInput, UpdateProductInput } from "@/features/product-master/types";

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isOptionalString = (v: unknown): v is string | undefined => v === undefined || typeof v === "string";
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isNullableNumber = (v: unknown): v is number | null => v === null || isFiniteNumber(v);

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((item) => typeof item === "string");

function isNewProductInput(v: unknown): v is NewProductInput {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;

  return (
    isNonEmptyString(r.code) &&
    isNonEmptyString(r.name) &&
    isNonEmptyString(r.category) &&
    isNonEmptyString(r.unit) &&
    isNonEmptyString(r.currency) &&
    isFiniteNumber(r.unitPrice) &&
    isStringArray(r.materials) &&
    isNullableNumber(r.weight) &&
    isNullableNumber(r.length) &&
    isNullableNumber(r.speed) &&
    (r.status === "active" || r.status === "inactive") &&
    isOptionalString(r.note)
  );
}

function isUpdateProductInput(v: unknown): v is UpdateProductInput {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return isNonEmptyString(r.productId) && isNewProductInput(r);
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

    const items = await listProducts(orgId);
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list products" }, { status: 500 });
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
    if (!isNewProductInput(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const saved = await upsertProduct(orgId, bodyUnknown);
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
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
    if (!isUpdateProductInput(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const saved = await upsertProduct(orgId, bodyUnknown);
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

function isDeleteProductBody(v: unknown): v is { productId: string } {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return isNonEmptyString(r.productId);
}

export async function DELETE(req: Request) {
  try {
    const orgIdOrRes = await requireOrgId(req);
    if (orgIdOrRes instanceof NextResponse) {
      return orgIdOrRes;
    }
    const orgId = orgIdOrRes;

    const bodyUnknown: unknown = await req.json();
    if (!isDeleteProductBody(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    await deleteProduct(orgId, bodyUnknown.productId);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
