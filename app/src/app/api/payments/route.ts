import { NextResponse } from "next/server";
import { verifyCognitoIdToken } from "@/lib/auth/verifyCognitoIdToken";
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

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    if (!isYearMonth(month)) {
      return NextResponse.json({ error: "Missing month" }, { status: 400 });
    }

    const items = await listPaymentsByMonth(orgId, month);
    return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list payments" }, { status: 500 });
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
    if (!isNewPaymentInput(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const saved = await createPayment(orgId, bodyUnknown);
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
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
    if (!isUpdatePaymentInput(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const saved = await updatePayment(orgId, bodyUnknown);
    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
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
  try {
    const orgIdOrRes = await requireOrgId(req);
    if (orgIdOrRes instanceof NextResponse) {
      return orgIdOrRes;
    }
    const orgId = orgIdOrRes;

    const bodyUnknown: unknown = await req.json();
    if (!isDeletePaymentBody(bodyUnknown)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    await deletePayment(orgId, bodyUnknown.yearMonth, bodyUnknown.paymentId);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
