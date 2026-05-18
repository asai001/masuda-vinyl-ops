export type ExchangeRates = {
  jpyPerUsd: number; // 1 USD = X JPY
  vndPerUsd: number; // 1 USD = X VND
  updatedAt?: string;
};

export type CompanyProfile = {
  issuerName: string;
  issuerAddress: string;
  issuerPhone: string;
  issuerFax: string;
};

export type SettingsData = ExchangeRates & CompanyProfile;
