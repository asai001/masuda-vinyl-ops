import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireAuthContext } from "@/lib/auth/requireAuthContext";
import {
  deletePaymentDefinition,
  listPaymentDefinitions,
  upsertPaymentDefinition,
} from "@/features/payment-master/api/server";
import type { NewPaymentInput, UpdatePaymentInput } from "@/features/payment-master/types";

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isOptionalString = (v: unknown): v is string | undefined => v === undefined || typeof v === "string";
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isValidPaymentDay = (v: unknown): v is number =>
  isFiniteNumber(v) && Number.isInteger(v) && v >= 1 && v <= 31;

function isNewPaymentInput(v: unknown): v is NewPaymentInput {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;

  if (
    !isNonEmptyString(r.category) ||
    !isNonEmptyString(r.content) ||
    typeof r.isFixedCost !== "boolean" ||
    !isNonEmptyString(r.currency) ||
    !isNonEmptyString(r.paymentMethod) ||
    !isValidPaymentDay(r.paymentDate) ||
    !isOptionalString(r.note)
  ) {
    return false;
  }

  if (r.isFixedCost) {
    return isFiniteNumber(r.fixedAmount);
  }

  return r.fixedAmount === null || r.fixedAmount === undefined;
}

function isUpdatePaymentInput(v: unknown): v is UpdatePaymentInput {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return isNonEmptyString(r.paymentDefId) && isNewPaymentInput(r);
}

const resource = "payment-definitions";

const toPaymentDefinitionTarget = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return {
    paymentDefId: typeof record.paymentDefId === "string" ? record.paymentDefId : undefined,
    category: typeof record.category === "string" ? record.category : undefined,
    content: typeof record.content === "string" ? record.content : undefined,
  };
};

export async function GET(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "payment-definitions.list";
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
    const items = await listPaymentDefinitions(orgId);
    await writeAuditLog({ req, orgId, actor, action, resource, result: "success", statusCode: 200 });
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list payment definitions";
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
    return NextResponse.json({ error: "Failed to list payment definitions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "payment-definitions.create";
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

  if (!isNewPaymentInput(bodyUnknown)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toPaymentDefinitionTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const saved = await upsertPaymentDefinition(orgId, bodyUnknown);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { paymentDefId: saved.paymentDefId, content: saved.content },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create payment definition";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toPaymentDefinitionTarget(bodyUnknown),
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to create payment definition" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "payment-definitions.update";
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

  if (!isUpdatePaymentInput(bodyUnknown)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toPaymentDefinitionTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const saved = await upsertPaymentDefinition(orgId, bodyUnknown);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { paymentDefId: saved.paymentDefId, content: saved.content },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update payment definition";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toPaymentDefinitionTarget(bodyUnknown),
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to update payment definition" }, { status: 500 });
  }
}

function isDeletePaymentBody(v: unknown): v is { paymentDefId: string } {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const r = v as Record<string, unknown>;
  return isNonEmptyString(r.paymentDefId);
}

export async function DELETE(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "payment-definitions.delete";
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

  if (!isDeletePaymentBody(bodyUnknown)) {
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
    await deletePaymentDefinition(orgId, bodyUnknown.paymentDefId);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { paymentDefId: bodyUnknown.paymentDefId },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete payment definition";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { paymentDefId: (bodyUnknown as { paymentDefId?: string }).paymentDefId },
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to delete payment definition" }, { status: 500 });
  }
}
