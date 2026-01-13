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
