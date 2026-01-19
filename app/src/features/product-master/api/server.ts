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
import type { ProductItem } from "../types";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

const ROLE_ARN = requireEnv("AWS_ROLE_ARN");
const PRODUCTS_MASTER_TABLE_NAME = requireEnv("PRODUCTS_MASTER_TABLE_NAME");
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

const normalizeMaterials = (materials: unknown): string[] => {
  if (!Array.isArray(materials)) {
    return [];
  }
  return materials.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
};

function buildProductItem(
  orgId: string,
  base: Partial<ProductItem> & { productId: string; displayNo: number },
): ProductItem {
  const code = (base.code ?? "").trim();
  const name = (base.name ?? "").trim();
  const category = base.category?.trim() || undefined;
  const unit = base.unit?.trim() || undefined;
  const currency = base.currency?.trim() || undefined;
  const status = base.status;
  const note = base.note?.trim() || undefined;
  const materials = normalizeMaterials(base.materials);

  const productId = base.productId;
  const codeLower = toLowerSafe(code);
  const nameLower = toLowerSafe(name);

  const unitPrice = typeof base.unitPrice === "number" ? base.unitPrice : undefined;
  const weight = typeof base.weight === "number" ? base.weight : base.weight === null ? null : undefined;
  const length = typeof base.length === "number" ? base.length : base.length === null ? null : undefined;
  const speed = typeof base.speed === "number" ? base.speed : base.speed === null ? null : undefined;

  return {
    orgId,
    productId,
    displayNo: base.displayNo,
    code,
    name,
    category,
    unit,
    currency,
    unitPrice,
    materials,
    weight,
    length,
    speed,
    status,
    note,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,

    ...(category
      ? {
          categoryIndexPk: `${orgId}#${category}`,
          categoryIndexSk: `${codeLower}#${productId}`,
        }
      : {}),
    ...(unit
      ? {
          unitIndexPk: `${orgId}#${unit}`,
          unitIndexSk: `${codeLower}#${productId}`,
        }
      : {}),
    ...(currency
      ? {
          currencyIndexPk: `${orgId}#${currency}`,
          currencyIndexSk: `${codeLower}#${productId}`,
        }
      : {}),
    ...(status
      ? {
          statusIndexPk: `${orgId}#${status}`,
          statusIndexSk: `${codeLower}#${productId}`,
        }
      : {}),
    ...(code
      ? {
          codeIndexPk: orgId,
          codeIndexSk: `${codeLower}#${productId}`,
        }
      : {}),
    ...(name
      ? {
          nameIndexPk: orgId,
          nameIndexSk: `${nameLower}#${productId}`,
        }
      : {}),
    ...(typeof unitPrice === "number"
      ? {
          unitPriceIndexPk: orgId,
          unitPriceIndexSk: unitPrice,
        }
      : {}),
    ...(typeof weight === "number"
      ? {
          weightIndexPk: orgId,
          weightIndexSk: weight,
        }
      : {}),
    ...(typeof length === "number"
      ? {
          lengthIndexPk: orgId,
          lengthIndexSk: length,
        }
      : {}),
    ...(typeof speed === "number"
      ? {
          speedIndexPk: orgId,
          speedIndexSk: speed,
        }
      : {}),
  } as ProductItem;
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

export async function listProducts(orgId: string): Promise<ProductItem[]> {
  const TableName = PRODUCTS_MASTER_TABLE_NAME;

  try {
    const res = await ddb.send(
      new QueryCommand({
        TableName,
        KeyConditionExpression: "orgId = :orgId",
        ExpressionAttributeValues: { ":orgId": orgId },
      }),
    );
    return (res.Items ?? []) as ProductItem[];
  } catch (e) {
    console.warn("QueryCommand failed. Falling back to ScanCommand.", e);
    const res = await ddb.send(
      new ScanCommand({
        TableName,
        FilterExpression: "orgId = :orgId",
        ExpressionAttributeValues: { ":orgId": orgId },
      }),
    );
    return (res.Items ?? []) as ProductItem[];
  }
}

export async function getProduct(orgId: string, productId: string): Promise<ProductItem | null> {
  const TableName = PRODUCTS_MASTER_TABLE_NAME;
  const res = await ddb.send(
    new GetCommand({
      TableName,
      Key: { orgId, productId },
    }),
  );
  return (res.Item ?? null) as ProductItem | null;
}

export async function upsertProduct(
  orgId: string,
  input: Partial<ProductItem> & { productId?: string },
): Promise<ProductItem> {
  const updatingId = input.productId?.trim() || "";
  const existing = updatingId ? await getProduct(orgId, updatingId) : null;

  const updatedAt = nowIso();

  if (!existing) {
    const displayNo = await nextSequence(orgId, "PRODUCT");
    const productId = crypto.randomUUID();

    const item = buildProductItem(orgId, {
      ...input,
      productId,
      displayNo,
      createdAt: updatedAt,
      updatedAt,
    });

    await ddb.send(new PutCommand({ TableName: PRODUCTS_MASTER_TABLE_NAME, Item: item }));
    return item;
  }

  const item = buildProductItem(orgId, {
    ...existing,
    ...input,
    productId: existing.productId,
    displayNo: existing.displayNo ?? 0,
    createdAt: existing.createdAt ?? updatedAt,
    updatedAt,
  });

  await ddb.send(new PutCommand({ TableName: PRODUCTS_MASTER_TABLE_NAME, Item: item }));
  return item;
}

export async function deleteProduct(orgId: string, productId: string): Promise<void> {
  const TableName = PRODUCTS_MASTER_TABLE_NAME;
  await ddb.send(
    new DeleteCommand({
      TableName,
      Key: { orgId, productId },
    }),
  );
}
