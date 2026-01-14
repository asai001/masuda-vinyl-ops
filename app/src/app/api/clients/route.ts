import { NextResponse } from "next/server";
import { verifyCognitoIdToken } from "@/lib/auth/verifyCognitoIdToken";
import { listClients } from "@/features/client-master/api/server";

function getBearer(req: Request) {
  const v = req.headers.get("authorization") ?? "";
  const m = v.match(/^Bearer\s+(.+)$/i);
  return m?.[1];
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
