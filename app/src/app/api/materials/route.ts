import { NextResponse } from "next/server";
import { verifyCognitoIdToken } from "@/lib/auth/verifyCognitoIdToken";
import { deleteMaterial, listMaterials, upsertMaterial } from "@/features/material-master/api/server";
import type { NewMaterialInput, UpdateMaterialInput } from "@/features/material-master/types";

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

const isOptionalString = (v: unknown): v is string | undefined => v === undefined || typeof v === "string";

const normalizeCode = (value: string) => value.trim().toLowerCase();

async function hasDuplicateCode(orgId: string, code: string, materialId?: string) {
  const normalized = normalizeCode(code);
  const items = await listMaterials(orgId);
  return items.some((item) => {
    const itemCode = normalizeCode(item.code ?? "");
    if (!itemCode) {
      return false;
    }
    if (itemCode !== normalized) {
      return false;
    }
    return materialId ? item.materialId !== materialId : true;
  });
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
    isNonEmptyString(r.supplier) &&
    isNonEmptyString(r.category) &&
    isNonEmptyString(r.unit) &&
    isNonEmptyString(r.currency) &&
    typeof r.unitPrice === "number" &&
    (r.status === "active" || r.status === "inactive") &&
    (r.note === undefined || isOptionalString(r.note)) // ✅ noteは空OK
  );
}

function isUpdateMaterialInput(v: unknown): v is UpdateMaterialInput {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;

  return (
    isNonEmptyString(r.materialId) &&
    isNonEmptyString(r.code) &&
    isNonEmptyString(r.name) &&
    isNonEmptyString(r.supplier) &&
    isNonEmptyString(r.category) &&
    isNonEmptyString(r.unit) &&
    isNonEmptyString(r.currency) &&
    typeof r.unitPrice === "number" &&
    (r.status === "active" || r.status === "inactive") &&
    (r.note === undefined || isOptionalString(r.note))
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

    if (await hasDuplicateCode(orgId, bodyUnknown.code)) {
      return NextResponse.json({ error: "品番が既に登録されています" }, { status: 409 });
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

    if (await hasDuplicateCode(orgId, bodyUnknown.code, bodyUnknown.materialId)) {
      return NextResponse.json({ error: "品番が既に登録されています" }, { status: 409 });
    }

    const saved = await upsertMaterial(orgId, bodyUnknown);
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update material" }, { status: 500 });
  }
}

function isDeleteMaterialBody(v: unknown): v is { materialId: string } {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return typeof r.materialId === "string" && r.materialId.trim().length > 0;
}
export async function DELETE(req: Request) {
  try {
    const orgIdOrRes = await requireOrgId(req);
    if (orgIdOrRes instanceof NextResponse) {
      return orgIdOrRes;
    }
    const orgId = orgIdOrRes;

    const bodyUnknown: unknown = await req.json();
    if (!isDeleteMaterialBody(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    await deleteMaterial(orgId, bodyUnknown.materialId);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete material" }, { status: 500 });
  }
}


