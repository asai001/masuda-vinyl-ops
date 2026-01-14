import { NextResponse } from "next/server";
import { verifyCognitoIdToken } from "@/lib/auth/verifyCognitoIdToken";
import { deleteClient, listClients, upsertClient } from "@/features/client-master/api/server";
import type { ClientItem } from "@/features/client-master/types";

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

    const body = (await req.json()) as Partial<Omit<ClientItem, "orgId">>;
    if (!body.clientId || typeof body.clientId !== "string") {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const saved = await upsertClient(orgId, body as Omit<ClientItem, "orgId">);
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

    const body = (await req.json()) as Partial<Omit<ClientItem, "orgId">>;
    if (!body.clientId || typeof body.clientId !== "string") {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const saved = await upsertClient(orgId, body as Omit<ClientItem, "orgId">);
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const orgIdOrRes = await requireOrgId(req);
    if (orgIdOrRes instanceof NextResponse) {
      return orgIdOrRes;
    }
    const orgId = orgIdOrRes;

    const body = (await req.json()) as { clientId?: unknown };
    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    await deleteClient(orgId, clientId);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
