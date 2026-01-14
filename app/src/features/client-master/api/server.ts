import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import type { ClientItem } from "../types";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

const ROLE_ARN = requireEnv("AWS_ROLE_ARN");
const CLIENTS_MASTER_TABLE_NAME = requireEnv("CLIENTS_MASTER_TABLE_NAME");
const SEQUENCES_TABLE_NAME = requireEnv("SEQUENCES_TABLE_NAME");

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION ?? "ap-northeast-1",
    ...(process.env.VERCEL ? { credentials: awsCredentialsProvider({ roleArn: ROLE_ARN }) } : {}),
  }),
  { marshallOptions: { removeUndefinedValues: true } },
);

function nowIso() {
  return new Date().toISOString();
}

function toLowerSafe(s: string | undefined) {
  return (s ?? "").trim().toLowerCase();
}

function buildClientItem(
  orgId: string,
  base: Partial<ClientItem> & { clientId: string; displayNo: number },
): ClientItem {
  const name = (base.name ?? "").trim();
  const nameLower = toLowerSafe(name);
  const category = base.category?.trim() || undefined;
  const region = base.region?.trim() || undefined;
  const currency = base.currency?.trim() || undefined;
  const status = base.status;

  const clientId = base.clientId;

  return {
    orgId,
    clientId,
    displayNo: base.displayNo,
    code: base.code?.trim() || undefined,
    name,
    category,
    region,
    currency,
    status,
    address: base.address?.trim() || undefined,
    phone: base.phone?.trim() || undefined,
    note: base.note?.trim() || undefined,
    taxId: base.taxId?.trim() || undefined,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,

    ...(category
      ? {
          categoryIndexPk: `${orgId}#${category}`,
          categoryIndexSk: `${nameLower}#${clientId}`,
        }
      : {}),
    ...(region
      ? {
          regionIndexPk: `${orgId}#${region}`,
          regionIndexSk: `${nameLower}#${clientId}`,
        }
      : {}),
    ...(currency
      ? {
          currencyIndexPk: `${orgId}#${currency}`,
          currencyIndexSk: `${nameLower}#${clientId}`,
        }
      : {}),
    ...(status
      ? {
          statusIndexPk: `${orgId}#${status}`,
          statusIndexSk: `${nameLower}#${clientId}`,
        }
      : {}),
  };
}

/**
 * 採番テーブル（masuda-vinyl-ops-sequences-xxx）から次の連番を原子的に採番する。
 * 期待スキーマ：PK=orgId, SK=sequenceName, 属性 current(number)
 */
export async function nextSequence(orgId: string, sequenceName: string): Promise<number> {
  const res = await ddb.send(
    new UpdateCommand({
      TableName: SEQUENCES_TABLE_NAME,
      Key: { orgId, sequenceName },
      UpdateExpression: "SET #current = if_not_exists(#current, :zero) + :inc",
      ExpressionAttributeNames: { "#current": "current" },
      ExpressionAttributeValues: { ":zero": 0, ":inc": 1 },
      ReturnValues: "UPDATED_NEW",
    }),
  );

  const current = res.Attributes?.current;
  if (typeof current !== "number") {
    throw new Error("Failed to allocate sequence");
  }
  return current;
}

export async function listClients(orgId: string): Promise<ClientItem[]> {
  const TableName = CLIENTS_MASTER_TABLE_NAME;

  // 1) まずは PK=orgId 前提で Query
  try {
    const res = await ddb.send(
      new QueryCommand({
        TableName,
        KeyConditionExpression: "orgId = :orgId",
        ExpressionAttributeValues: { ":orgId": orgId },
      }),
    );
    return (res.Items ?? []) as ClientItem[];
  } catch (e) {
    // 2) キー名が違う/Query不可の場合のフォールバック（小規模前提）
    console.warn("QueryCommand failed. Falling back to ScanCommand.", e);
    const res = await ddb.send(
      new ScanCommand({
        TableName,
        FilterExpression: "orgId = :orgId",
        ExpressionAttributeValues: { ":orgId": orgId },
      }),
    );
    return (res.Items ?? []) as ClientItem[];
  }
}

export async function getClient(orgId: string, clientId: string): Promise<ClientItem | null> {
  const TableName = CLIENTS_MASTER_TABLE_NAME;
  const res = await ddb.send(
    new GetCommand({
      TableName,
      Key: { orgId, clientId },
    }),
  );
  return (res.Item ?? null) as ClientItem | null;
}

export async function upsertClient(
  orgId: string,
  input: Partial<ClientItem> & { name: string; clientId?: string },
): Promise<ClientItem> {
  const updatingClientId = input.clientId?.trim() || "";
  const existing = updatingClientId ? await getClient(orgId, updatingClientId) : null;

  const updatedAt = nowIso();

  if (!existing) {
    // --- create ---
    const displayNo = await nextSequence(orgId, "CLIENT");
    // displayNo を見やすい ID にも使う（必要なら後で変更OK）
    const clientId = `cli_${String(displayNo).padStart(6, "0")}`;

    const item = buildClientItem(orgId, {
      ...input,
      clientId,
      displayNo,
      createdAt: updatedAt,
      updatedAt,
    });

    await ddb.send(new PutCommand({ TableName: CLIENTS_MASTER_TABLE_NAME, Item: item }));
    return item;
  }

  // --- update ---
  const item = buildClientItem(orgId, {
    ...existing,
    ...input,
    clientId: existing.clientId,
    displayNo: existing.displayNo ?? 0,
    createdAt: existing.createdAt ?? updatedAt,
    updatedAt,
  });

  await ddb.send(new PutCommand({ TableName: CLIENTS_MASTER_TABLE_NAME, Item: item }));
  return item;
}

export async function deleteClient(orgId: string, clientId: string): Promise<void> {
  const TableName = CLIENTS_MASTER_TABLE_NAME;
  await ddb.send(
    new DeleteCommand({
      TableName,
      Key: { orgId, clientId },
    }),
  );
}
