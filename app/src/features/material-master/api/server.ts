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
import type { MaterialItem } from "../types";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

const ROLE_ARN = requireEnv("AWS_ROLE_ARN");
const MATERIALS_MASTER_TABLE_NAME = requireEnv("MATERIALS_MASTER_TABLE_NAME");
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

function buildMaterialItem(
  orgId: string,
  base: Partial<MaterialItem> & { materialId: string; displayNo: number },
): MaterialItem {
  const code = (base.code ?? "").trim();
  const name = (base.name ?? "").trim();
  const supplier = base.supplier?.trim() || undefined;
  const category = base.category?.trim() || undefined;
  const unit = base.unit?.trim() || undefined;
  const currency = base.currency?.trim() || undefined;
  const status = base.status;
  const note = base.note?.trim() || undefined;

  const materialId = base.materialId;
  const nameLower = toLowerSafe(name);

  return {
    orgId,
    materialId,
    displayNo: base.displayNo,
    code,
    name,
    supplier,
    category,
    unit,
    currency,
    unitPrice: typeof base.unitPrice === "number" ? base.unitPrice : undefined,
    status,
    note,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,

    ...(category
      ? {
          categoryIndexPk: `${orgId}#${category}`,
          categoryIndexSk: `${nameLower}#${materialId}`,
        }
      : {}),
    ...(supplier
      ? {
          supplierIndexPk: `${orgId}#${supplier}`,
          supplierIndexSk: `${nameLower}#${materialId}`,
        }
      : {}),
    ...(currency
      ? {
          currencyIndexPk: `${orgId}#${currency}`,
          currencyIndexSk: `${nameLower}#${materialId}`,
        }
      : {}),
    ...(status
      ? {
          statusIndexPk: `${orgId}#${status}`,
          statusIndexSk: `${nameLower}#${materialId}`,
        }
      : {}),
  } as MaterialItem;
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

export async function listMaterials(orgId: string): Promise<MaterialItem[]> {
  const TableName = MATERIALS_MASTER_TABLE_NAME;

  // 1) まずは PK=orgId 前提で Query
  try {
    const res = await ddb.send(
      new QueryCommand({
        TableName,
        KeyConditionExpression: "orgId = :orgId",
        ExpressionAttributeValues: { ":orgId": orgId },
      }),
    );
    return (res.Items ?? []) as MaterialItem[];
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
    return (res.Items ?? []) as MaterialItem[];
  }
}

export async function getMaterial(orgId: string, materialId: string): Promise<MaterialItem | null> {
  const TableName = MATERIALS_MASTER_TABLE_NAME;
  const res = await ddb.send(
    new GetCommand({
      TableName,
      Key: { orgId, materialId },
    }),
  );
  return (res.Item ?? null) as MaterialItem | null;
}

export async function upsertMaterial(
  orgId: string,
  input: Partial<MaterialItem> & { name: string; code: string; materialId?: string },
): Promise<MaterialItem> {
  const updatingMaterialId = input.materialId?.trim() || "";
  const existing = updatingMaterialId ? await getMaterial(orgId, updatingMaterialId) : null;

  const updatedAt = nowIso();

  if (!existing) {
    // --- create ---
    const displayNo = await nextSequence(orgId, "MATERIAL");

    // ✅ materialId はUUID
    const materialId = crypto.randomUUID();

    const item = buildMaterialItem(orgId, {
      ...input,
      materialId,
      displayNo,
      createdAt: updatedAt,
      updatedAt,
    });

    await ddb.send(new PutCommand({ TableName: MATERIALS_MASTER_TABLE_NAME, Item: item }));
    return item;
  }

  // --- update ---
  const item = buildMaterialItem(orgId, {
    ...existing,
    ...input,
    materialId: existing.materialId, // ✅ 既存のmaterialIdは不変
    displayNo: existing.displayNo ?? 0,
    createdAt: existing.createdAt ?? updatedAt,
    updatedAt,
  });

  await ddb.send(new PutCommand({ TableName: MATERIALS_MASTER_TABLE_NAME, Item: item }));
  return item;
}

export async function deleteMaterial(orgId: string, materialId: string): Promise<void> {
  const TableName = MATERIALS_MASTER_TABLE_NAME;
  await ddb.send(
    new DeleteCommand({
      TableName,
      Key: { orgId, materialId },
    }),
  );
}
