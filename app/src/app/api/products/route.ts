import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireAuthContext } from "@/lib/auth/requireAuthContext";
import { deleteProduct, listProducts, upsertProduct } from "@/features/product-master/api/server";
import { listMaterials } from "@/features/material-master/api/server";
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
    isNullableNumber(r.packaging) &&
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

const resource = "products";

const toProductTarget = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return {
    productId: typeof record.productId === "string" ? record.productId : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
    name: typeof record.name === "string" ? record.name : undefined,
  };
};

const findUnknownMaterials = async (orgId: string, materials: string[]) => {
  const registered = await listMaterials(orgId);
  const codeSet = new Set(
    registered
      .map((item) => (typeof item.code === "string" ? item.code.trim() : ""))
      .filter(Boolean),
  );
  const normalized = Array.from(new Set(materials.map((item) => item.trim()).filter(Boolean)));
  return normalized.filter((item) => !codeSet.has(item));
};

export async function GET(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "products.list";
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
    const items = await listProducts(orgId);
    await writeAuditLog({ req, orgId, actor, action, resource, result: "success", statusCode: 200 });
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list products";
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
    return NextResponse.json({ error: "Failed to list products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "products.create";
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

  if (!isNewProductInput(bodyUnknown)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toProductTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const unknownMaterials = await findUnknownMaterials(orgId, bodyUnknown.materials);
  if (unknownMaterials.length) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toProductTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: `Unknown materials: ${unknownMaterials.join(", ")}`,
    });
    return NextResponse.json(
      { error: "材料マスタに登録されていない材料は指定できません", unknownMaterials },
      { status: 400 },
    );
  }

  try {
    const saved = await upsertProduct(orgId, bodyUnknown);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { productId: saved.productId, code: saved.code },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create product";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toProductTarget(bodyUnknown),
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "products.update";
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

  if (!isUpdateProductInput(bodyUnknown)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toProductTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const unknownMaterials = await findUnknownMaterials(orgId, bodyUnknown.materials);
  if (unknownMaterials.length) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toProductTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: `Unknown materials: ${unknownMaterials.join(", ")}`,
    });
    return NextResponse.json(
      { error: "材料マスタに登録されていない材料は指定できません", unknownMaterials },
      { status: 400 },
    );
  }

  try {
    const saved = await upsertProduct(orgId, bodyUnknown);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { productId: saved.productId, code: saved.code },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update product";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toProductTarget(bodyUnknown),
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
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
  const auth = await requireAuthContext(req);
  const action = "products.delete";
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

  if (!isDeleteProductBody(bodyUnknown)) {
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
    await deleteProduct(orgId, bodyUnknown.productId);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { productId: bodyUnknown.productId },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete product";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { productId: (bodyUnknown as { productId?: string }).productId },
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
