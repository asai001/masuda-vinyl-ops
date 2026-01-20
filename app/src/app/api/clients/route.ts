import { NextResponse } from "next/server";
import { verifyCognitoIdToken } from "@/lib/auth/verifyCognitoIdToken";
import { deleteClient, listClients, upsertClient } from "@/features/client-master/api/server";
import type { NewClientInput, UpdateClientInput } from "@/features/client-master/types";

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isOptionalString = (v: unknown): v is string | undefined => v === undefined || typeof v === "string";

function isNewClientInput(v: unknown): v is NewClientInput {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;

  return (
    isNonEmptyString(r.name) &&
    isOptionalString(r.note) &&
    isNonEmptyString(r.category) &&
    isNonEmptyString(r.region) &&
    isNonEmptyString(r.currency) &&
    (r.status === "active" || r.status === "inactive") &&
    isOptionalString(r.address) &&
    isOptionalString(r.phone) &&
    isOptionalString(r.taxId)
  );
}

function isUpdateClientInput(v: unknown): v is UpdateClientInput {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;

  return (
    isNonEmptyString(r.clientId) &&
    isNonEmptyString(r.name) &&
    isOptionalString(r.note) &&
    isNonEmptyString(r.category) &&
    isNonEmptyString(r.region) &&
    isNonEmptyString(r.currency) &&
    (r.status === "active" || r.status === "inactive") &&
    isOptionalString(r.address) &&
    isOptionalString(r.phone) &&
    isOptionalString(r.taxId)
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
    const orgIdOrRes = await requireOrgId(req);
    if (orgIdOrRes instanceof NextResponse) {
      return orgIdOrRes;
    }
    const orgId = orgIdOrRes;

    const items = await listClients(orgId);
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list clients" }, { status: 500 });
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
    if (!isNewClientInput(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const saved = await upsertClient(orgId, bodyUnknown); // ✅ serverでUUID採番
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
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
    if (!isUpdateClientInput(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const saved = await upsertClient(orgId, bodyUnknown);
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

function isDeleteClientBody(v: unknown): v is { clientId: string } {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return typeof r.clientId === "string" && r.clientId.trim().length > 0;
}

export async function DELETE(req: Request) {
  try {
    const orgIdOrRes = await requireOrgId(req);
    if (orgIdOrRes instanceof NextResponse) {
      return orgIdOrRes;
    }
    const orgId = orgIdOrRes;

    const bodyUnknown: unknown = await req.json();
    if (!isDeleteClientBody(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    await deleteClient(orgId, bodyUnknown.clientId);

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
