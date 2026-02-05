import { getIdTokenJwt } from "@/lib/auth/cognito";
import {
  paymentStatusOptions,
  type NewPaymentManagementInput,
  type PaymentManagementItem,
  type PaymentManagementRow,
  type PaymentStatusKey,
  type UpdatePaymentManagementInput,
} from "../types";

async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = await getIdTokenJwt();
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, { ...init, headers });
}

const statusKeys = paymentStatusOptions.map((option) => option.key);

const normalizeStatus = (value: unknown): PaymentStatusKey =>
  statusKeys.includes(value as PaymentStatusKey) ? (value as PaymentStatusKey) : "unpaid";

function toRow(item: PaymentManagementItem): PaymentManagementRow {
  const id = Number(item.displayNo ?? 0);
  const paymentDate = item.paymentDate ?? "";
  const yearMonth = item.yearMonth ?? (paymentDate ? paymentDate.slice(0, 7) : "");
  return {
    id,
    paymentId: item.paymentId,
    yearMonth,
    transferDestinationName: item.transferDestinationName ?? "",
    category: item.category ?? "",
    content: item.content ?? "",
    amount: typeof item.amount === "number" ? item.amount : 0,
    currency: item.currency ?? "",
    paymentMethod: item.paymentMethod ?? "",
    paymentDate,
    status: normalizeStatus(item.status),
    note: item.note ?? "",
    isFixedCost: Boolean(item.isFixedCost),
  };
}

export async function fetchPaymentManagementRows(yearMonth: string): Promise<PaymentManagementRow[]> {
  const res = await authFetch(`/api/payments?month=${encodeURIComponent(yearMonth)}`, { method: "GET" });
  if (!res.ok) {
    throw new Error("Failed to fetch payments");
  }
  const items = (await res.json()) as PaymentManagementItem[];
  const rows = items.map(toRow);
  rows.sort((a, b) => (a.id || Number.MAX_SAFE_INTEGER) - (b.id || Number.MAX_SAFE_INTEGER));
  return rows;
}

export async function createPayment(input: NewPaymentManagementInput): Promise<PaymentManagementItem> {
  const res = await authFetch("/api/payments", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to create payment: ${res.status} ${text}`);
  }
  return (await res.json()) as PaymentManagementItem;
}

const toUpdatePayload = (row: PaymentManagementRow): UpdatePaymentManagementInput => ({
  paymentId: row.paymentId,
  yearMonth: row.yearMonth,
  transferDestinationName: row.transferDestinationName ?? "",
  category: row.category,
  content: row.content,
  amount: row.amount,
  currency: row.currency,
  paymentMethod: row.paymentMethod,
  paymentDate: row.paymentDate,
  status: row.status,
  note: row.note,
  isFixedCost: row.isFixedCost,
});

export async function updatePayment(row: PaymentManagementRow): Promise<void> {
  const res = await authFetch("/api/payments", {
    method: "PUT",
    body: JSON.stringify(toUpdatePayload(row)),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to update payment: ${res.status} ${text}`);
  }
}

export async function deletePayment(paymentId: string, yearMonth: string): Promise<void> {
  const res = await authFetch("/api/payments", {
    method: "DELETE",
    body: JSON.stringify({ paymentId, yearMonth }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to delete payment: ${res.status} ${text}`);
  }
}

export async function generatePayments(yearMonth: string): Promise<void> {
  const res = await authFetch("/api/payments/generate", {
    method: "POST",
    body: JSON.stringify({ yearMonth }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to generate payments: ${res.status} ${text}`);
  }
}
