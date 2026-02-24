import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { requireAuthContext } from "@/lib/auth/requireAuthContext";
import {
  createPayment,
  deletePayment,
  listPaymentsByMonth,
  updatePayment,
} from "@/features/payment-management/api/server";
import {
  paymentStatusOptions,
  type NewPaymentManagementInput,
  type PaymentStatusKey,
  type UpdatePaymentManagementInput,
} from "@/features/payment-management/types";

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isOptionalString = (v: unknown): v is string | undefined => v === undefined || typeof v === "string";
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const statusKeys = paymentStatusOptions.map((option) => option.key);
const isPaymentStatus = (value: unknown): value is PaymentStatusKey =>
  typeof value === "string" && statusKeys.includes(value as PaymentStatusKey);

const isYearMonth = (value: unknown): value is string =>
  isNonEmptyString(value) && /^\d{4}-\d{2}$/.test(value.trim());

const isPaymentDate = (value: unknown): value is string => {
  if (!isNonEmptyString(value)) {
    return false;
  }
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return false;
  }
  return !Number.isNaN(Date.parse(trimmed));
};

function isNewPaymentInput(value: unknown): value is NewPaymentManagementInput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    isOptionalString(record.transferDestinationName) &&
    isNonEmptyString(record.category) &&
    isNonEmptyString(record.content) &&
    isFiniteNumber(record.amount) &&
    isNonEmptyString(record.currency) &&
    isNonEmptyString(record.paymentMethod) &&
    isPaymentDate(record.paymentDate) &&
    isPaymentStatus(record.status) &&
    typeof record.isFixedCost === "boolean" &&
    isOptionalString(record.note)
  );
}

function isUpdatePaymentInput(value: unknown): value is UpdatePaymentManagementInput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return isNonEmptyString(record.paymentId) && isYearMonth(record.yearMonth) && isNewPaymentInput(record);
}

const resource = "payments";

const toPaymentTarget = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  return {
    paymentId: typeof record.paymentId === "string" ? record.paymentId : undefined,
    yearMonth: typeof record.yearMonth === "string" ? record.yearMonth : undefined,
    category: typeof record.category === "string" ? record.category : undefined,
    content: typeof record.content === "string" ? record.content : undefined,
  };
};

export async function GET(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "payments.list";
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

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  if (!isYearMonth(month)) {
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { month },
      result: "failure",
      statusCode: 400,
      errorMessage: "Missing month",
    });
    return NextResponse.json({ error: "Missing month" }, { status: 400 });
  }

  try {
    const items = await listPaymentsByMonth(orgId, month);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { month },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list payments";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { month },
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to list payments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "payments.create";
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
      target: toPaymentTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const saved = await createPayment(orgId, bodyUnknown);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { paymentId: saved.paymentId, yearMonth: saved.yearMonth },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create payment";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toPaymentTarget(bodyUnknown),
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "payments.update";
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
      target: toPaymentTarget(bodyUnknown),
      result: "failure",
      statusCode: 400,
      errorMessage: "Invalid request body",
    });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const saved = await updatePayment(orgId, bodyUnknown);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { paymentId: saved.paymentId, yearMonth: saved.yearMonth },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update payment";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: toPaymentTarget(bodyUnknown),
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}

function isDeletePaymentBody(value: unknown): value is { paymentId: string; yearMonth: string } {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return isNonEmptyString(record.paymentId) && isYearMonth(record.yearMonth);
}

export async function DELETE(req: Request) {
  const auth = await requireAuthContext(req);
  const action = "payments.delete";
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
    await deletePayment(orgId, bodyUnknown.yearMonth, bodyUnknown.paymentId);
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: { paymentId: bodyUnknown.paymentId, yearMonth: bodyUnknown.yearMonth },
      result: "success",
      statusCode: 200,
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete payment";
    await writeAuditLog({
      req,
      orgId,
      actor,
      action,
      resource,
      target: {
        paymentId: (bodyUnknown as { paymentId?: string }).paymentId,
        yearMonth: (bodyUnknown as { yearMonth?: string }).yearMonth,
      },
      result: "failure",
      statusCode: 500,
      errorMessage: msg,
    });
    console.error(e);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
