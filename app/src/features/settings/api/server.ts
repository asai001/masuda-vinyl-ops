import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, type UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

export type ExchangeRates = {
  jpyPerUsd: number; // 1 USD = X JPY
  vndPerUsd: number; // 1 USD = X VND
};

export type CompanyProfile = {
  issuerName: string;
  issuerAddress: string;
  issuerPhone: string;
  issuerFax: string;
};

export type SettingsData = ExchangeRates & CompanyProfile;

export type SettingsItem = {
  orgId: string;
  settingsKey: string; // usually "DEFAULT"
  createdAt?: string;
  updatedAt?: string;

  defaultCurrency?: "JPY" | "USD" | "VND" | string;
  invoiceFooterNote?: string;
  issuerAddress?: string;
  issuerName?: string;
  issuerPhone?: string;
  issuerFax?: string;

  exchangeRates?: Partial<ExchangeRates>;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

const TABLE_NAME = requireEnv("SETTINGS_TABLE_NAME");
const REGION = requireEnv("AWS_REGION");
const ROLE_ARN = requireEnv("AWS_ROLE_ARN");
const dynamoDBClient = new DynamoDBClient({
  region: REGION,
  credentials: process.env.VERCEL
    ? awsCredentialsProvider({ roleArn: ROLE_ARN })
    : fromIni({ profile: requireEnv("AWS_PROFILE") }),
});
const ddb = DynamoDBDocumentClient.from(dynamoDBClient, { marshallOptions: { removeUndefinedValues: true } });

const DEFAULT_SETTINGS_KEY = "DEFAULT";
const DEFAULT_JPY_PER_USD = 150;
const DEFAULT_VND_PER_USD = 25000;

const normalizeExchangeRates = (settings: SettingsItem | null): ExchangeRates => {
  const jpyPerUsd = Number(settings?.exchangeRates?.jpyPerUsd ?? DEFAULT_JPY_PER_USD);
  const vndPerUsd = Number(settings?.exchangeRates?.vndPerUsd ?? DEFAULT_VND_PER_USD);

  return {
    jpyPerUsd: Number.isFinite(jpyPerUsd) && jpyPerUsd > 0 ? jpyPerUsd : DEFAULT_JPY_PER_USD,
    vndPerUsd: Number.isFinite(vndPerUsd) && vndPerUsd > 0 ? vndPerUsd : DEFAULT_VND_PER_USD,
  };
};

const toTrimmedText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const normalizeCompanyProfile = (settings: SettingsItem | null): CompanyProfile => {
  return {
    issuerName: toTrimmedText(settings?.issuerName),
    issuerAddress: toTrimmedText(settings?.issuerAddress),
    issuerPhone: toTrimmedText(settings?.issuerPhone),
    issuerFax: toTrimmedText(settings?.issuerFax),
  };
};

export async function getSettings(orgId: string, settingsKey: string = DEFAULT_SETTINGS_KEY): Promise<SettingsItem | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { orgId, settingsKey },
    })
  );

  return (res.Item as SettingsItem | undefined) ?? null;
}

export async function getExchangeRates(orgId: string, settingsKey: string = DEFAULT_SETTINGS_KEY): Promise<ExchangeRates> {
  const settings = await getSettings(orgId, settingsKey);
  return normalizeExchangeRates(settings);
}

export async function getCompanyProfile(orgId: string, settingsKey: string = DEFAULT_SETTINGS_KEY): Promise<CompanyProfile> {
  const settings = await getSettings(orgId, settingsKey);
  return normalizeCompanyProfile(settings);
}

export async function getSettingsData(orgId: string, settingsKey: string = DEFAULT_SETTINGS_KEY): Promise<SettingsData> {
  const settings = await getSettings(orgId, settingsKey);
  return {
    ...normalizeExchangeRates(settings),
    ...normalizeCompanyProfile(settings),
  };
}

export async function updateExchangeRates(
  orgId: string,
  input: ExchangeRates,
  settingsKey: string = DEFAULT_SETTINGS_KEY
): Promise<ExchangeRates> {
  const now = new Date().toISOString();

  const params: UpdateCommandInput = {
    TableName: TABLE_NAME,
    Key: { orgId, settingsKey },
    UpdateExpression: "SET #exchangeRates = :exchangeRates, #updatedAt = :updatedAt, #createdAt = if_not_exists(#createdAt, :createdAt)",
    ExpressionAttributeNames: {
      "#exchangeRates": "exchangeRates",
      "#updatedAt": "updatedAt",
      "#createdAt": "createdAt",
    },
    ExpressionAttributeValues: {
      ":exchangeRates": {
        jpyPerUsd: input.jpyPerUsd,
        vndPerUsd: input.vndPerUsd,
      },
      ":updatedAt": now,
      ":createdAt": now,
    },
    ReturnValues: "ALL_NEW",
  };

  const res = await ddb.send(new UpdateCommand(params));
  const item = (res.Attributes as SettingsItem | undefined) ?? null;
  return normalizeExchangeRates(item);
}

export async function updateCompanyProfile(
  orgId: string,
  input: CompanyProfile,
  settingsKey: string = DEFAULT_SETTINGS_KEY
): Promise<CompanyProfile> {
  const now = new Date().toISOString();
  const issuerName = toTrimmedText(input.issuerName);
  const issuerAddress = toTrimmedText(input.issuerAddress);
  const issuerPhone = toTrimmedText(input.issuerPhone);
  const issuerFax = toTrimmedText(input.issuerFax);

  const params: UpdateCommandInput = {
    TableName: TABLE_NAME,
    Key: { orgId, settingsKey },
    UpdateExpression:
      "SET #issuerName = :issuerName, #issuerAddress = :issuerAddress, #issuerPhone = :issuerPhone, #issuerFax = :issuerFax, #updatedAt = :updatedAt, #createdAt = if_not_exists(#createdAt, :createdAt)",
    ExpressionAttributeNames: {
      "#issuerName": "issuerName",
      "#issuerAddress": "issuerAddress",
      "#issuerPhone": "issuerPhone",
      "#issuerFax": "issuerFax",
      "#updatedAt": "updatedAt",
      "#createdAt": "createdAt",
    },
    ExpressionAttributeValues: {
      ":issuerName": issuerName,
      ":issuerAddress": issuerAddress,
      ":issuerPhone": issuerPhone,
      ":issuerFax": issuerFax,
      ":updatedAt": now,
      ":createdAt": now,
    },
    ReturnValues: "ALL_NEW",
  };

  const res = await ddb.send(new UpdateCommand(params));
  const item =
    (res.Attributes as SettingsItem | undefined) ??
    ({
      orgId,
      settingsKey,
      issuerName,
      issuerAddress,
      issuerPhone,
      issuerFax,
    } as SettingsItem);

  return normalizeCompanyProfile(item);
}
