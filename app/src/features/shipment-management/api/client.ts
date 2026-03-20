import { getIdTokenJwt } from "@/lib/auth/cognito";
import type { NewShipmentInput, ShipmentItem, ShipmentRow, UpdateShipmentInput } from "../types";
import { toShipmentRow } from "@/features/shipment-management/shipmentUtils";

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

export async function fetchShipmentRows(): Promise<ShipmentRow[]> {
  const response = await authFetch("/api/shipments", { method: "GET" });
  if (!response.ok) {
    throw new Error("Failed to fetch shipments");
  }

  const items = (await response.json()) as ShipmentItem[];
  const rows = items.map(toShipmentRow);
  rows.sort((left, right) => left.deliveryDate.localeCompare(right.deliveryDate) || left.id - right.id);
  return rows;
}

export async function createShipment(input: NewShipmentInput): Promise<ShipmentItem> {
  const response = await authFetch("/api/shipments", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to create shipment: ${response.status} ${text}`);
  }
  return (await response.json()) as ShipmentItem;
}

export async function updateShipment(input: UpdateShipmentInput): Promise<ShipmentItem> {
  const response = await authFetch("/api/shipments", {
    method: "PUT",
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to update shipment: ${response.status} ${text}`);
  }
  return (await response.json()) as ShipmentItem;
}

export async function deleteShipment(shipmentId: string): Promise<void> {
  const response = await authFetch("/api/shipments", {
    method: "DELETE",
    body: JSON.stringify({ shipmentId }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to delete shipment: ${response.status} ${text}`);
  }
}
