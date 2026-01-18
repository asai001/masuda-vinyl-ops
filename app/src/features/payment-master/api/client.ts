import { getIdTokenJwt } from "@/lib/auth/cognito";
import type { NewPaymentInput, PaymentDefinitionItem, PaymentRow, UpdatePaymentInput } from "../types";

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

function toRow(item: PaymentDefinitionItem): PaymentRow {
  const id = Number(item.displayNo ?? 0);
  return {
    id,
    paymentDefId: item.paymentDefId,
    category: item.category ?? "",
    content: item.content ?? "",
    isFixedCost: item.isFixedCost ?? false,
    fixedAmount: typeof item.fixedAmount === "number" ? item.fixedAmount : null,
    currency: item.currency ?? "",
    paymentMethod: item.paymentMethod ?? "",
    paymentDate: typeof item.paymentDate === "number" ? item.paymentDate : 0,
    note: item.note ?? "",
  };
}

export async function fetchPaymentRows(): Promise<PaymentRow[]> {
  const res = await authFetch("/api/payment-definitions", { method: "GET" });
  if (!res.ok) {
    throw new Error("Failed to fetch payment definitions");
  }

  const items = (await res.json()) as PaymentDefinitionItem[];
  const rows = items.map(toRow);
  rows.sort((a, b) => (a.id || Number.MAX_SAFE_INTEGER) - (b.id || Number.MAX_SAFE_INTEGER));
  return rows;
}

export async function createPaymentDefinition(input: NewPaymentInput): Promise<PaymentDefinitionItem> {
  const res = await authFetch("/api/payment-definitions", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to create payment definition: ${res.status} ${text}`);
  }
  return (await res.json()) as PaymentDefinitionItem;
}

function toUpdatePayload(row: PaymentRow): UpdatePaymentInput {
  return {
    paymentDefId: row.paymentDefId,
    category: row.category,
    content: row.content,
    isFixedCost: row.isFixedCost,
    fixedAmount: row.fixedAmount,
    currency: row.currency,
    paymentMethod: row.paymentMethod,
    paymentDate: row.paymentDate,
    note: row.note,
  };
}

export async function updatePaymentDefinition(row: PaymentRow): Promise<void> {
  const res = await authFetch("/api/payment-definitions", {
    method: "PUT",
    body: JSON.stringify(toUpdatePayload(row)),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to update payment definition: ${res.status} ${text}`);
  }
}

export async function deletePaymentDefinition(paymentDefId: string): Promise<void> {
  const res = await authFetch("/api/payment-definitions", {
    method: "DELETE",
    body: JSON.stringify({ paymentDefId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to delete payment definition: ${res.status} ${text}`);
  }
}
