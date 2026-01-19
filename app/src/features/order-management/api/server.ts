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
import {
  documentStatusOptions,
  orderStatusOptions,
  type DocumentStatus,
  type OrderLineItem,
  type OrderStatus,
  type PurchaseOrderItem,
} from "../types";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

const ROLE_ARN = requireEnv("AWS_ROLE_ARN");
const PURCHASE_ORDERS_TABLE_NAME = requireEnv("PURCHASE_ORDERS_TABLE_NAME");
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

const orderStatusKeys = orderStatusOptions.map((option) => option.key);
const documentStatusKeys = documentStatusOptions.map((option) => option.key);

const normalizeStatus = (value: Partial<OrderStatus> | undefined): OrderStatus =>
  orderStatusKeys.reduce((acc, key) => {
    acc[key] = Boolean(value?.[key]);
    return acc;
  }, {} as OrderStatus);

const normalizeDocumentStatus = (value: Partial<DocumentStatus> | undefined): DocumentStatus =>
  documentStatusKeys.reduce((acc, key) => {
    acc[key] = Boolean(value?.[key]);
    return acc;
  }, {} as DocumentStatus);

const normalizeItems = (items: unknown): OrderLineItem[] => {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item, index) => {
    if (!item || typeof item !== "object") {
      return { id: index + 1, itemCode: "", itemName: "", unit: "", quantity: 0, unitPrice: 0 };
    }
    const record = item as Record<string, unknown>;
    return {
      id: typeof record.id === "number" ? record.id : index + 1,
      itemCode: typeof record.itemCode === "string" ? record.itemCode.trim() : "",
      itemName: typeof record.itemName === "string" ? record.itemName.trim() : "",
      unit: typeof record.unit === "string" ? record.unit.trim() : "",
      quantity: typeof record.quantity === "number" ? record.quantity : 0,
      unitPrice: typeof record.unitPrice === "number" ? record.unitPrice : 0,
    };
  });
};

const calculateAmount = (items: OrderLineItem[]) => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

function buildPurchaseOrderItem(
  orgId: string,
  base: Partial<PurchaseOrderItem> & { purchaseOrderId: string; displayNo: number },
): PurchaseOrderItem {
  const orderDate = (base.orderDate ?? "").trim();
  const deliveryDate = (base.deliveryDate ?? "").trim();
  const supplier = (base.supplier ?? "").trim();
  const currency = (base.currency ?? "").trim();
  const note = base.note?.trim() || undefined;

  const items = normalizeItems(base.items);
  const amount = typeof base.amount === "number" ? base.amount : calculateAmount(items);
  const status = normalizeStatus(base.status);
  const documentStatus = normalizeDocumentStatus(base.documentStatus);

  const purchaseOrderId = base.purchaseOrderId;

  return {
    orgId,
    purchaseOrderId,
    displayNo: base.displayNo,
    orderDate,
    deliveryDate,
    supplier,
    items,
    currency,
    amount,
    note,
    status,
    documentStatus,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,

    orderDateIndexPk: orderDate ? orgId : undefined,
    orderDateIndexSk: orderDate || undefined,
    deliveryDateIndexPk: deliveryDate ? orgId : undefined,
    deliveryDateIndexSk: deliveryDate || undefined,
    supplierIndexPk: supplier ? `${orgId}#${supplier}` : undefined,
    supplierIndexSk: supplier ? orderDate : undefined,

    // スパース運用のため true のものだけ index 属性を付与する
    ...(status.ordered ? { orderedStatusIndexPk: orgId, orderedStatusIndexSk: orderDate } : {}),
    ...(status.delivered ? { deliveredStatusIndexPk: orgId, deliveredStatusIndexSk: orderDate } : {}),
    ...(status.paid ? { paidStatusIndexPk: orgId, paidStatusIndexSk: orderDate } : {}),
    ...(documentStatus.orderSent ? { orderSentIndexPk: orgId, orderSentIndexSk: orderDate } : {}),
    ...(documentStatus.deliveryReceived ? { deliveryReceivedIndexPk: orgId, deliveryReceivedIndexSk: orderDate } : {}),
    ...(documentStatus.invoiceReceived ? { invoiceReceivedIndexPk: orgId, invoiceReceivedIndexSk: orderDate } : {}),
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

export async function listPurchaseOrders(orgId: string): Promise<PurchaseOrderItem[]> {
  const TableName = PURCHASE_ORDERS_TABLE_NAME;

  // 1) まずは PK=orgId 前提で Query
  try {
    const res = await ddb.send(
      new QueryCommand({
        TableName,
        KeyConditionExpression: "orgId = :orgId",
        ExpressionAttributeValues: { ":orgId": orgId },
      }),
    );
    return (res.Items ?? []) as PurchaseOrderItem[];
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
    return (res.Items ?? []) as PurchaseOrderItem[];
  }
}

export async function getPurchaseOrder(orgId: string, purchaseOrderId: string): Promise<PurchaseOrderItem | null> {
  const TableName = PURCHASE_ORDERS_TABLE_NAME;
  const res = await ddb.send(
    new GetCommand({
      TableName,
      Key: { orgId, purchaseOrderId },
    }),
  );
  return (res.Item ?? null) as PurchaseOrderItem | null;
}

export async function upsertPurchaseOrder(
  orgId: string,
  input: Partial<PurchaseOrderItem> & { purchaseOrderId?: string },
): Promise<PurchaseOrderItem> {
  const updatingId = input.purchaseOrderId?.trim() || "";
  const existing = updatingId ? await getPurchaseOrder(orgId, updatingId) : null;

  const updatedAt = nowIso();

  if (!existing) {
    const displayNo = await nextSequence(orgId, "PO");
    const purchaseOrderId = crypto.randomUUID();

    const item = buildPurchaseOrderItem(orgId, {
      ...input,
      purchaseOrderId,
      displayNo,
      createdAt: updatedAt,
      updatedAt,
    });

    await ddb.send(new PutCommand({ TableName: PURCHASE_ORDERS_TABLE_NAME, Item: item }));
    return item;
  }

  const item = buildPurchaseOrderItem(orgId, {
    ...existing,
    ...input,
    purchaseOrderId: existing.purchaseOrderId,
    displayNo: existing.displayNo ?? 0,
    createdAt: existing.createdAt ?? updatedAt,
    updatedAt,
  });

  await ddb.send(new PutCommand({ TableName: PURCHASE_ORDERS_TABLE_NAME, Item: item }));
  return item;
}

export async function deletePurchaseOrder(orgId: string, purchaseOrderId: string): Promise<void> {
  const TableName = PURCHASE_ORDERS_TABLE_NAME;
  await ddb.send(
    new DeleteCommand({
      TableName,
      Key: { orgId, purchaseOrderId },
    }),
  );
}
