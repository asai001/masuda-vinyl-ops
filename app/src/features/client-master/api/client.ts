import { getIdTokenJwt } from "@/lib/auth/cognito";
import type { ClientItem, ClientRow, NewClientInput, UpdateClientInput } from "../types";

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

function toRow(item: ClientItem): ClientRow {
  const id = Number(item.displayNo ?? 0);
  // displayNo が無い場合は 0 になるので、UI側で並び替え時に最後に寄る
  return {
    id,
    clientId: item.clientId,
    name: item.name ?? "",
    note: item.note ?? "",
    address: item.address ?? "",
    phone: item.phone ?? "",
    taxId: item.taxId,
    category: item.category ?? undefined,
    region: item.region ?? "",
    currency: item.currency ?? "",
    status: (item.status === "active" || item.status === "inactive" ? item.status : undefined) as
      | "active"
      | "inactive"
      | undefined,
  };
}

export async function fetchClientRows(): Promise<ClientRow[]> {
  const res = await authFetch("/api/clients", { method: "GET" });
  if (!res.ok) {
    throw new Error("Failed to fetch clients");
  }
  const items = (await res.json()) as ClientItem[];

  const rows = items.map(toRow);

  // id(displayNo) が 0 のものが混ざっても崩れないように一旦整列
  rows.sort((a, b) => (a.id || Number.MAX_SAFE_INTEGER) - (b.id || Number.MAX_SAFE_INTEGER));
  return rows;
}

export async function createClient(input: NewClientInput): Promise<ClientItem> {
  const res = await authFetch("/api/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to create client: ${res.status} ${text}`);
  }
  return (await res.json()) as ClientItem;
}

function toUpdateInputFromRow(row: ClientRow): UpdateClientInput {
  return {
    clientId: row.clientId,
    name: row.name,
    note: row.note,
    address: row.address,
    phone: row.phone,
    taxId: row.taxId,
    category: row.category ?? "",
    region: row.region,
    currency: row.currency,
    status: row.status === "inactive" ? "inactive" : "active",
  };
}

export async function updateClient(row: ClientRow): Promise<void> {
  const res = await authFetch("/api/clients", {
    method: "PUT",
    body: JSON.stringify(toUpdateInputFromRow(row)),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to update client: ${res.status} ${text}`);
  }
}

export async function deleteClient(clientId: string): Promise<void> {
  const res = await authFetch("/api/clients", {
    method: "DELETE",
    body: JSON.stringify({ clientId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to delete client: ${res.status} ${text}`);
  }
}
