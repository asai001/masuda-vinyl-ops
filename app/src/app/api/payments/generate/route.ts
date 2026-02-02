import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireAuthContext } from "@/lib/auth/requireAuthContext";
import { generatePayments } from "@/features/payment-management/api/server";

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isYearMonth = (value: unknown): value is string =>
  isNonEmptyString(value) && /^\d{4}-\d{2}$/.test(value.trim());

const resource = "payments";

export async function POST(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "payments.generate";
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

  if (!bodyUnknown || typeof bodyUnknown !== "object") {
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
  const record = bodyUnknown as Record<string, unknown>;
  if (!isYearMonth(record.yearMonth)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { yearMonth: record.yearMonth },
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid yearMonth",
    });
    return NextResponse.json({ error: "Invalid yearMonth" }, { status: 400 });
  }

  try {
    const generated = await generatePayments(orgId, record.yearMonth);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { yearMonth: record.yearMonth, createdCount: generated.length },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(
      { createdCount: generated.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to generate payments";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { yearMonth: record.yearMonth },
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to generate payments" }, { status: 500 });
  }
}
