import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";
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
import type { PaymentDefinitionItem } from "../types";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

const ROLE_ARN = requireEnv("AWS_ROLE_ARN");
const PAYMENT_DEFINITIONS_MASTER_TABLE_NAME = requireEnv("PAYMENT_DEFINITIONS_MASTER_TABLE_NAME");
const SEQUENCES_TABLE_NAME = requireEnv("SEQUENCES_TABLE_NAME");

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION ?? "ap-northeast-1",
    credentials: process.env.VERCEL
      ? awsCredentialsProvider({ roleArn: ROLE_ARN })
      : fromIni({ profile: requireEnv("AWS_PROFILE") }),
  }),
  { marshallOptions: { removeUndefinedValues: true } },
);

function nowIso() {
  return new Date().toISOString();
}

function toLowerSafe(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function buildPaymentDefinitionItem(
  orgId: string,
  base: Partial<PaymentDefinitionItem> & { paymentDefId: string; displayNo: number },
): PaymentDefinitionItem {
  const transferDestinationName = base.transferDestinationName?.trim() || undefined;
  const category = base.category?.trim() || "";
  const content = (base.content ?? "").trim();
  const currency = base.currency?.trim() || undefined;
  const paymentMethod = base.paymentMethod?.trim() || undefined;
  const note = base.note?.trim() || undefined;

  const isFixedCost = typeof base.isFixedCost === "boolean" ? base.isFixedCost : false;
  const fixedCostKey = isFixedCost ? "fixed" : "variable";

  const fixedAmount =
    typeof base.fixedAmount === "number" ? base.fixedAmount : base.fixedAmount === null ? null : undefined;
  const paymentDate = typeof base.paymentDate === "number" ? base.paymentDate : undefined;

  const contentLower = toLowerSafe(content);

  return {
    orgId,
    paymentDefId: base.paymentDefId,
    displayNo: base.displayNo,
    transferDestinationName,
    category,
    content,
    isFixedCost,
    fixedAmount,
    currency,
    paymentMethod,
    paymentDate,
    note,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,

    ...(category
      ? {
          categoryIndexPk: `${orgId}#${category}`,
          categoryIndexSk: `${contentLower}#${base.paymentDefId}`,
        }
      : {}),
    ...(typeof isFixedCost === "boolean"
      ? {
          fixedCostIndexPk: `${orgId}#${fixedCostKey}`,
          fixedCostIndexSk: `${contentLower}#${base.paymentDefId}`,
        }
      : {}),
    ...(currency
      ? {
          currencyIndexPk: `${orgId}#${currency}`,
          currencyIndexSk: `${contentLower}#${base.paymentDefId}`,
        }
      : {}),
    ...(paymentMethod
      ? {
          paymentMethodIndexPk: `${orgId}#${paymentMethod}`,
          paymentMethodIndexSk: `${contentLower}#${base.paymentDefId}`,
        }
      : {}),
    ...(typeof paymentDate === "number"
      ? {
          paymentDayIndexPk: orgId,
          paymentDayIndexSk: paymentDate,
        }
      : {}),
    ...(typeof fixedAmount === "number"
      ? {
          fixedAmountIndexPk: orgId,
          fixedAmountIndexSk: fixedAmount,
        }
      : {}),
  } as PaymentDefinitionItem;
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

export async function listPaymentDefinitions(orgId: string): Promise<PaymentDefinitionItem[]> {
  const TableName = PAYMENT_DEFINITIONS_MASTER_TABLE_NAME;
  try {
    const res = await ddb.send(
      new QueryCommand({
        TableName,
        KeyConditionExpression: "orgId = :orgId",
        ExpressionAttributeValues: { ":orgId": orgId },
      }),
    );
    return (res.Items ?? []) as PaymentDefinitionItem[];
  } catch (e) {
    console.warn("QueryCommand failed. Falling back to ScanCommand.", e);
    const res = await ddb.send(
      new ScanCommand({
        TableName,
        FilterExpression: "orgId = :orgId",
        ExpressionAttributeValues: { ":orgId": orgId },
      }),
    );
    return (res.Items ?? []) as PaymentDefinitionItem[];
  }
}

export async function getPaymentDefinition(orgId: string, paymentDefId: string): Promise<PaymentDefinitionItem | null> {
  const TableName = PAYMENT_DEFINITIONS_MASTER_TABLE_NAME;
  const res = await ddb.send(
    new GetCommand({
      TableName,
      Key: { orgId, paymentDefId },
    }),
  );
  return (res.Item ?? null) as PaymentDefinitionItem | null;
}

export async function upsertPaymentDefinition(
  orgId: string,
  input: Partial<PaymentDefinitionItem> & { paymentDefId?: string },
): Promise<PaymentDefinitionItem> {
  const updatingId = input.paymentDefId?.trim() || "";
  const existing = updatingId ? await getPaymentDefinition(orgId, updatingId) : null;

  const updatedAt = nowIso();

  if (!existing) {
    const displayNo = await nextSequence(orgId, "PAYMENT_DEF");
    const paymentDefId = crypto.randomUUID();

    const item = buildPaymentDefinitionItem(orgId, {
      ...input,
      paymentDefId,
      displayNo,
      createdAt: updatedAt,
      updatedAt,
    });

    await ddb.send(new PutCommand({ TableName: PAYMENT_DEFINITIONS_MASTER_TABLE_NAME, Item: item }));
    return item;
  }

  const item = buildPaymentDefinitionItem(orgId, {
    ...existing,
    ...input,
    paymentDefId: existing.paymentDefId,
    displayNo: existing.displayNo ?? 0,
    createdAt: existing.createdAt ?? updatedAt,
    updatedAt,
  });

  await ddb.send(new PutCommand({ TableName: PAYMENT_DEFINITIONS_MASTER_TABLE_NAME, Item: item }));
  return item;
}

export async function deletePaymentDefinition(orgId: string, paymentDefId: string): Promise<void> {
  const TableName = PAYMENT_DEFINITIONS_MASTER_TABLE_NAME;
  await ddb.send(
    new DeleteCommand({
      TableName,
      Key: { orgId, paymentDefId },
    }),
  );
}
