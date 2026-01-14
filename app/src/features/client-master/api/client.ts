import { getIdTokenJwt } from "@/lib/auth/cognito";
import type { ClientItem, ClientRow } from "../types";

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

function toItemFromRow(row: Omit<ClientRow, "id">, displayNo?: number): Omit<ClientItem, "orgId"> {
  return {
    clientId: row.clientId,
    displayNo,
    name: row.name,
    category: row.category ?? undefined,
    region: row.region ?? undefined,
    currency: row.currency ?? undefined,
    status: row.status ?? undefined,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    note: row.note ?? undefined,
    taxId: row.taxId ?? undefined,
  };
}

function toItemFromFullRow(row: ClientRow): Omit<ClientItem, "orgId"> {
  return toItemFromRow(
    {
      clientId: row.clientId,
      name: row.name,
      category: row.category,
      region: row.region,
      currency: row.currency,
      status: row.status,
      address: row.address,
      phone: row.phone,
      note: row.note,
      taxId: row.taxId,
    },
    row.id,
  );
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

export async function createClient(row: Omit<ClientRow, "id">, displayNo: number): Promise<void> {
  const res = await authFetch("/api/clients", {
    method: "POST",
    body: JSON.stringify(toItemFromRow(row, displayNo)),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to create client: ${res.status} ${text}`);
  }
}

export async function updateClient(row: ClientRow): Promise<void> {
  const res = await authFetch("/api/clients", {
    method: "PUT",
    body: JSON.stringify(toItemFromFullRow(row)),
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
