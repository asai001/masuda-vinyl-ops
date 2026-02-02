import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireAuthContext } from "@/lib/auth/requireAuthContext";
import { getExchangeRates, updateExchangeRates } from "@/features/settings/api/server";

const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });
const resource = "settings";

export async function GET(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "settings.read";
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
    const rates = await getExchangeRates(orgId, "DEFAULT");
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { settingsKey: "DEFAULT" },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(rates, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load settings";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { settingsKey: "DEFAULT" },
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "settings.update";
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { settingsKey: "DEFAULT" },
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid JSON",
    });
    return badRequest("Invalid JSON");
  }

  if (!body || typeof body !== "object") {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { settingsKey: "DEFAULT" },
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid payload",
    });
    return badRequest("Invalid payload");
  }

  const record = body as Record<string, unknown>;
  const jpyPerUsd = Number(record.jpyPerUsd);
  const vndPerUsd = Number(record.vndPerUsd);

  if (!Number.isFinite(jpyPerUsd) || jpyPerUsd <= 0) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { settingsKey: "DEFAULT" },
      result: "failure",
      statusCode: 400,
      errorMessage: "jpyPerUsd must be a positive number",
    });
    return badRequest("jpyPerUsd must be a positive number");
  }
  if (!Number.isFinite(vndPerUsd) || vndPerUsd <= 0) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { settingsKey: "DEFAULT" },
      result: "failure",
      statusCode: 400,
      errorMessage: "vndPerUsd must be a positive number",
    });
    return badRequest("vndPerUsd must be a positive number");
  }

  try {
    const updated = await updateExchangeRates(orgId, { jpyPerUsd, vndPerUsd }, "DEFAULT");
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { settingsKey: "DEFAULT" },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(updated, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update settings";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { settingsKey: "DEFAULT" },
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
