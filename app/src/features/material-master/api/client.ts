import { getIdTokenJwt } from "@/lib/auth/cognito";
import type { MaterialItem, MaterialRow, NewMaterialInput } from "../types";

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

function toRow(item: MaterialItem): MaterialRow {
  const id = Number(item.displayNo ?? 0);
  return {
    id,
    materialId: item.materialId,
    code: item.code ?? "",
    name: item.name ?? "",
    supplier: item.supplier ?? "",
    category: item.category ?? "",
    unit: item.unit ?? "",
    currency: item.currency ?? "",
    unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : 0,
    status: item.status === "inactive" ? "inactive" : "active",
    note: item.note ?? "",
  };
}

// ✅ Update用：MaterialRow -> API payload（materialId必須）
function toUpdatePayload(row: MaterialRow): Omit<MaterialItem, "orgId"> {
  return {
    materialId: row.materialId,
    // displayNo はサーバー側で保持する想定なので、送る必要は基本なし
    // もし「編集でdisplayNoも更新したい」なら row.id を入れる
    code: row.code,
    name: row.name,
    supplier: row.supplier || undefined,
    category: row.category || undefined,
    unit: row.unit || undefined,
    currency: row.currency || undefined,
    unitPrice: row.unitPrice,
    status: row.status,
    note: row.note || undefined,
  };
}

export async function fetchMaterialRows(): Promise<MaterialRow[]> {
  const res = await authFetch("/api/materials", { method: "GET" });
  if (!res.ok) {
    throw new Error("Failed to fetch materials");
  }

  const items = (await res.json()) as MaterialItem[];
  const rows = items.map(toRow);
  rows.sort((a, b) => (a.id || Number.MAX_SAFE_INTEGER) - (b.id || Number.MAX_SAFE_INTEGER));
  return rows;
}

// ✅ Create：NewMaterialInputをそのまま送る（ID生成はサーバー）
export async function createMaterial(input: NewMaterialInput): Promise<MaterialItem> {
  const res = await authFetch("/api/materials", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to create material: ${res.status} ${text}`);
  }
  return (await res.json()) as MaterialItem;
}

export async function updateMaterial(row: MaterialRow): Promise<void> {
  const res = await authFetch("/api/materials", {
    method: "PUT",
    body: JSON.stringify(toUpdatePayload(row)),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to update material: ${res.status} ${text}`);
  }
}

export async function deleteMaterial(materialId: string): Promise<void> {
  const res = await authFetch("/api/materials", {
    method: "DELETE",
    body: JSON.stringify({ materialId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to delete material: ${res.status} ${text}`);
  }
}
