import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, type UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

type ExchangeRates = {
  jpyPerUsd: number; // 1 USD = X JPY
  vndPerUsd: number; // 1 USD = X VND
};

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
const ddb = DynamoDBDocumentClient.from(dynamoDBClient, { marshallOptions: { removeUndefinedValues: true } }); // removeUndefinedValues: true → udefined のプロパティを自動で省いてくれる

const DEFAULT_SETTINGS_KEY = "DEFAULT";

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

  // データが未作成でも UI が落ちないようにデフォルトを返す
  const jpyPerUsd = Number(settings?.exchangeRates?.jpyPerUsd ?? 150);
  const vndPerUsd = Number(settings?.exchangeRates?.vndPerUsd ?? 25000);

  return {
    jpyPerUsd: Number.isFinite(jpyPerUsd) && jpyPerUsd > 0 ? jpyPerUsd : 150,
    vndPerUsd: Number.isFinite(vndPerUsd) && vndPerUsd > 0 ? vndPerUsd : 25000,
  };
}

export async function updateExchangeRates(
  orgId: string,
  input: ExchangeRates,
  settingsKey: string = DEFAULT_SETTINGS_KEY
): Promise<ExchangeRates> {
  const now = new Date().toISOString();

  // Upsert（無ければ作る）。createdAt は最初の1回だけセット。
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
  const item = res.Attributes as SettingsItem | undefined;

  const jpyPerUsd = Number(item?.exchangeRates?.jpyPerUsd ?? input.jpyPerUsd);
  const vndPerUsd = Number(item?.exchangeRates?.vndPerUsd ?? input.vndPerUsd);

  return { jpyPerUsd, vndPerUsd };
}
