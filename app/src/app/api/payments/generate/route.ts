import { NextResponse } from "next/server";
import { verifyCognitoIdToken } from "@/lib/auth/verifyCognitoIdToken";
import { generatePayments } from "@/features/payment-management/api/server";

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isYearMonth = (value: unknown): value is string =>
  isNonEmptyString(value) && /^\d{4}-\d{2}$/.test(value.trim());

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

export async function POST(req: Request) {
  try {
    const orgIdOrRes = await requireOrgId(req);
    if (orgIdOrRes instanceof NextResponse) {
      return orgIdOrRes;
    }
    const orgId = orgIdOrRes;

    const bodyUnknown: unknown = await req.json();
    if (!bodyUnknown || typeof bodyUnknown !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const record = bodyUnknown as Record<string, unknown>;
    if (!isYearMonth(record.yearMonth)) {
      return NextResponse.json({ error: "Invalid yearMonth" }, { status: 400 });
    }

    const generated = await generatePayments(orgId, record.yearMonth);
    return NextResponse.json(
      { createdCount: generated.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to generate payments" }, { status: 500 });
  }
}
