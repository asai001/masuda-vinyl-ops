import type { ExchangeRates } from "../types";
import { getIdTokenJwt } from "@/lib/auth/cognito";

async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = await getIdTokenJwt();
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  // JSON送る時だけ必要
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(input, { ...init, headers, cache: "no-store" });
  if (res.status === 401 || res.status === 403) {
    throw new Error("UNAUTHORIZED");
  }
  return res;
}

export async function fetchExchangeRates(signal?: AbortSignal): Promise<ExchangeRates> {
  const res = await authFetch("/api/settings", { method: "GET", cache: "no-store", signal });
  if (!res.ok) {
    throw new Error("Failed to fetch settings");
  }
  return (await res.json()) as ExchangeRates;
}

export async function saveExchangeRates(rates: Pick<ExchangeRates, "jpyPerUsd" | "vndPerUsd">): Promise<ExchangeRates> {
  const res = await authFetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rates),
  });
  if (!res.ok) {
    throw new Error("Failed to save settings");
  }
  return (await res.json()) as ExchangeRates;
}
