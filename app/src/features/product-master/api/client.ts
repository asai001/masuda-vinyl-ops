import { getIdTokenJwt } from "@/lib/auth/cognito";
import type { NewProductInput, ProductItem, ProductRow, UpdateProductInput } from "../types";

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

const normalizeMaterials = (materials: unknown): string[] => {
  if (!Array.isArray(materials)) {
    return [];
  }
  return materials.filter((item): item is string => typeof item === "string");
};

function toRow(item: ProductItem): ProductRow {
  const id = Number(item.displayNo ?? 0);
  return {
    id,
    productId: item.productId,
    code: item.code ?? "",
    name: item.name ?? "",
    category: item.category ?? "",
    unit: item.unit ?? "",
    currency: item.currency ?? "",
    unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : 0,
    materials: normalizeMaterials(item.materials),
    weight: typeof item.weight === "number" ? item.weight : null,
    length: typeof item.length === "number" ? item.length : null,
    speed: typeof item.speed === "number" ? item.speed : null,
    status: item.status === "inactive" ? "inactive" : "active",
    note: item.note ?? "",
  };
}

export async function fetchProductRows(): Promise<ProductRow[]> {
  const res = await authFetch("/api/products", { method: "GET" });
  if (!res.ok) {
    throw new Error("Failed to fetch products");
  }

  const items = (await res.json()) as ProductItem[];
  const rows = items.map(toRow);
  rows.sort((a, b) => (a.id || Number.MAX_SAFE_INTEGER) - (b.id || Number.MAX_SAFE_INTEGER));
  return rows;
}

export async function createProduct(input: NewProductInput): Promise<ProductItem> {
  const res = await authFetch("/api/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to create product: ${res.status} ${text}`);
  }
  return (await res.json()) as ProductItem;
}

function toUpdatePayload(row: ProductRow): UpdateProductInput {
  return {
    productId: row.productId,
    code: row.code,
    name: row.name,
    category: row.category,
    unit: row.unit,
    currency: row.currency,
    unitPrice: row.unitPrice,
    materials: row.materials,
    weight: row.weight,
    length: row.length,
    speed: row.speed,
    status: row.status,
    note: row.note,
  };
}

export async function updateProduct(row: ProductRow): Promise<void> {
  const res = await authFetch("/api/products", {
    method: "PUT",
    body: JSON.stringify(toUpdatePayload(row)),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to update product: ${res.status} ${text}`);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  const res = await authFetch("/api/products", {
    method: "DELETE",
    body: JSON.stringify({ productId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to delete product: ${res.status} ${text}`);
  }
}
