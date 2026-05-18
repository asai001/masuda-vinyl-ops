import type { CompanyProfile, ExchangeRates, SettingsData } from "../types";
import { getIdTokenJwt } from "@/lib/auth/cognito";

const DEFAULT_JPY_PER_USD = 150;
const DEFAULT_VND_PER_USD = 25000;

type RawSettingsData = Partial<SettingsData>;

const normalizeSettingsData = (raw: RawSettingsData): SettingsData => {
  const jpyPerUsd = Number(raw.jpyPerUsd);
  const vndPerUsd = Number(raw.vndPerUsd);

  return {
    jpyPerUsd: Number.isFinite(jpyPerUsd) && jpyPerUsd > 0 ? jpyPerUsd : DEFAULT_JPY_PER_USD,
    vndPerUsd: Number.isFinite(vndPerUsd) && vndPerUsd > 0 ? vndPerUsd : DEFAULT_VND_PER_USD,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
    issuerName: typeof raw.issuerName === "string" ? raw.issuerName : "",
    issuerAddress: typeof raw.issuerAddress === "string" ? raw.issuerAddress : "",
    issuerPhone: typeof raw.issuerPhone === "string" ? raw.issuerPhone : "",
    issuerFax: typeof raw.issuerFax === "string" ? raw.issuerFax : "",
  };
};

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

export async function fetchSettings(signal?: AbortSignal): Promise<SettingsData> {
  const res = await authFetch("/api/settings", { method: "GET", cache: "no-store", signal });
  if (!res.ok) {
    throw new Error("Failed to fetch settings");
  }
  const raw = (await res.json()) as RawSettingsData;
  return normalizeSettingsData(raw);
}

export async function fetchExchangeRates(signal?: AbortSignal): Promise<ExchangeRates> {
  const settings = await fetchSettings(signal);
  return {
    jpyPerUsd: settings.jpyPerUsd,
    vndPerUsd: settings.vndPerUsd,
    updatedAt: settings.updatedAt,
  };
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
  const raw = (await res.json()) as RawSettingsData;
  const settings = normalizeSettingsData(raw);
  return {
    jpyPerUsd: settings.jpyPerUsd,
    vndPerUsd: settings.vndPerUsd,
    updatedAt: settings.updatedAt,
  };
}

export async function saveCompanyProfile(profile: CompanyProfile): Promise<CompanyProfile> {
  const res = await authFetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    throw new Error("Failed to save settings");
  }
  const raw = (await res.json()) as RawSettingsData;
  const settings = normalizeSettingsData(raw);
  return {
    issuerName: settings.issuerName,
    issuerAddress: settings.issuerAddress,
    issuerPhone: settings.issuerPhone,
    issuerFax: settings.issuerFax,
  };
}
