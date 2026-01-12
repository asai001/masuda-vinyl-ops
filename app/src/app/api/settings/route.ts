import { NextResponse } from "next/server";
import { verifyCognitoIdToken } from "@/lib/auth/verifyCognitoIdToken";
import { getExchangeRates, updateExchangeRates } from "@/features/settings/api/server";

function getBearer(req: Request) {
  const v = req.headers.get("authorization") ?? "";
  const m = v.match(/^Bearer\s+(.+)$/i);
  return m?.[1];
}

const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });

export async function GET(req: Request) {
  try {
    const token = getBearer(req);
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
    }
    let payload;
    try {
      payload = await verifyCognitoIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const orgId = payload["custom:orgId"];
    if (typeof orgId !== "string" || !orgId) {
      return NextResponse.json({ error: "orgId not found in token" }, { status: 403 });
    }

    const rates = await getExchangeRates(orgId, "DEFAULT");
    return NextResponse.json(rates, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const token = getBearer(req);
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  let payload;
  try {
    payload = await verifyCognitoIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const orgId = payload["custom:orgId"];
  if (typeof orgId !== "string" || !orgId) {
    return NextResponse.json({ error: "orgId not found in token" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  if (!body || typeof body !== "object") {
    return badRequest("Invalid payload");
  }

  const record = body as Record<string, unknown>;
  const jpyPerUsd = Number(record.jpyPerUsd);
  const vndPerUsd = Number(record.vndPerUsd);

  if (!Number.isFinite(jpyPerUsd) || jpyPerUsd <= 0) {
    return badRequest("jpyPerUsd must be a positive number");
  }
  if (!Number.isFinite(vndPerUsd) || vndPerUsd <= 0) {
    return badRequest("vndPerUsd must be a positive number");
  }

  try {
    const updated = await updateExchangeRates(orgId, { jpyPerUsd, vndPerUsd }, "DEFAULT");
    return NextResponse.json(updated, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
