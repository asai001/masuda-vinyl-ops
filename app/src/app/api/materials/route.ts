import { NextResponse } from "next/server";
import { verifyCognitoIdToken } from "@/lib/auth/verifyCognitoIdToken";
import { deleteMaterial, listMaterials, upsertMaterial } from "@/features/material-master/api/server";
import type { NewMaterialInput, UpdateMaterialInput } from "@/features/material-master/types";

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

const isOptionalString = (v: unknown): v is string | undefined => v === undefined || typeof v === "string";

function isUpdateMaterialInput(v: unknown): v is UpdateMaterialInput {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;

  return (
    isNonEmptyString(r.materialId) &&
    isNonEmptyString(r.code) &&
    isNonEmptyString(r.name) &&
    (r.supplier === undefined || isNonEmptyString(r.supplier)) &&
    (r.category === undefined || isNonEmptyString(r.category)) &&
    (r.unit === undefined || isNonEmptyString(r.unit)) &&
    (r.currency === undefined || isNonEmptyString(r.currency)) &&
    (r.unitPrice === undefined || typeof r.unitPrice === "number") &&
    (r.status === undefined || r.status === "active" || r.status === "inactive") &&
    (r.note === undefined || isOptionalString(r.note))
  );
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
    const token = getBearer(req);
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const payload = await verifyCognitoIdToken(token);
    const orgId = String(payload["custom:orgId"] ?? "");
    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId claim" }, { status: 403 });
    }

    const items = await listMaterials(orgId);
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list materials" }, { status: 500 });
  }
}

function isNewMaterialInput(v: unknown): v is NewMaterialInput {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;

  return (
    isNonEmptyString(r.code) &&
    isNonEmptyString(r.name) &&
    (r.supplier === undefined || isNonEmptyString(r.supplier)) &&
    (r.category === undefined || isNonEmptyString(r.category)) &&
    (r.unit === undefined || isNonEmptyString(r.unit)) &&
    (r.currency === undefined || isNonEmptyString(r.currency)) &&
    (r.unitPrice === undefined || typeof r.unitPrice === "number") &&
    (r.status === undefined || r.status === "active" || r.status === "inactive") &&
    (r.note === undefined || isOptionalString(r.note)) // note は空でもOKにするなら isOptionalString
  );
}

export async function POST(req: Request) {
  try {
    const orgIdOrRes = await requireOrgId(req);
    if (orgIdOrRes instanceof NextResponse) {
      return orgIdOrRes;
    }
    const orgId = orgIdOrRes;

    const bodyUnknown: unknown = await req.json();

    if (!isNewMaterialInput(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const saved = await upsertMaterial(orgId, bodyUnknown); // ✅ NewMaterialInput 型で渡る
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create material" }, { status: 500 });
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
    if (!isUpdateMaterialInput(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const saved = await upsertMaterial(orgId, bodyUnknown);
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update material" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const orgIdOrRes = await requireOrgId(req);
    if (orgIdOrRes instanceof NextResponse) {
      return orgIdOrRes;
    }
    const orgId = orgIdOrRes;

    const body = (await req.json()) as { materialId?: unknown };
    const materialId = typeof body.materialId === "string" ? body.materialId : "";
    if (!materialId) {
      return NextResponse.json({ error: "materialId is required" }, { status: 400 });
    }

    await deleteMaterial(orgId, materialId);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete material" }, { status: 500 });
  }
}
