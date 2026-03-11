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
  salesDocumentStatusOptions,
  salesStatusOptions,
  type SalesDocumentStatus,
  type SalesLineItem,
  type SalesOrderItem,
  type SalesShipment,
  type SalesStatus,
} from "../types";
import { getPrimaryDeliveryDate } from "../salesManagementUtils";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

const ROLE_ARN = requireEnv("AWS_ROLE_ARN");
const SALES_ORDERS_TABLE_NAME = requireEnv("SALES_ORDERS_TABLE_NAME");
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

const salesStatusKeys = salesStatusOptions.map((option) => option.key);
const documentStatusKeys = salesDocumentStatusOptions.map((option) => option.key);

const normalizeStatus = (value: Partial<SalesStatus> | undefined): SalesStatus =>
  salesStatusKeys.reduce((acc, key) => {
    acc[key] = Boolean(value?.[key]);
    return acc;
  }, {} as SalesStatus);

const normalizeDocumentStatus = (value: Partial<SalesDocumentStatus> | undefined): SalesDocumentStatus =>
  documentStatusKeys.reduce((acc, key) => {
    acc[key] = Boolean(value?.[key]);
    return acc;
  }, {} as SalesDocumentStatus);

const normalizeMaterials = (materials: unknown): string[] => {
  if (!Array.isArray(materials)) {
    return [];
  }
  return materials
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const normalizeNullableNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const normalizeShipments = (
  shipments: unknown,
  fallbackDeliveryDate = "",
  legacyShippedQuantity: unknown = 0,
): SalesShipment[] => {
  const fallbackDate = normalizeString(fallbackDeliveryDate);

  if (Array.isArray(shipments)) {
    return shipments.map((shipment, index) => {
      if (!shipment || typeof shipment !== "object") {
        return {
          id: index + 1,
          deliveryDate: fallbackDate,
          shippedQuantity: 0,
        };
      }

      const record = shipment as Record<string, unknown>;
      return {
        id: typeof record.id === "number" ? record.id : index + 1,
        deliveryDate: normalizeString(record.deliveryDate) || fallbackDate,
        shippedQuantity: normalizeNumber(record.shippedQuantity),
      };
    });
  }

  const legacyDate = fallbackDate;
  const shippedQuantity = normalizeNumber(legacyShippedQuantity);
  if (!legacyDate && shippedQuantity <= 0) {
    return [];
  }

  return [
    {
      id: 1,
      deliveryDate: legacyDate,
      shippedQuantity,
    },
  ];
};

const normalizeItems = (items: unknown, fallbackDeliveryDate = ""): SalesLineItem[] => {
  const fallbackDate = normalizeString(fallbackDeliveryDate);
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item, index) => {
    if (!item || typeof item !== "object") {
      return {
        id: index + 1,
        productCode: "",
        productName: "",
        materials: [],
        stockQuantity: null,
        orderQuantity: 0,
        unitPrice: 0,
        palletCount: 0,
        totalWeight: 0,
        weight: null,
        length: null,
        speed: null,
        shipments: normalizeShipments([], fallbackDate, 0),
      };
    }
    const record = item as Record<string, unknown>;
    return {
      id: typeof record.id === "number" ? record.id : index + 1,
      productCode: normalizeString(record.productCode),
      productName: normalizeString(record.productName),
      materials: normalizeMaterials(record.materials),
      stockQuantity: normalizeNullableNumber(record.stockQuantity),
      orderQuantity: normalizeNumber(record.orderQuantity),
      unitPrice: normalizeNumber(record.unitPrice),
      palletCount: normalizeNumber(record.palletCount),
      totalWeight: normalizeNumber(record.totalWeight),
      weight: normalizeNullableNumber(record.weight),
      length: normalizeNullableNumber(record.length),
      speed: normalizeNullableNumber(record.speed),
      shipments: normalizeShipments(record.shipments, normalizeString(record.deliveryDate) || fallbackDate, record.shippedQuantity),
    };
  });
};

function buildSalesOrderItem(
  orgId: string,
  base: Partial<SalesOrderItem> & { salesOrderId: string; displayNo: number },
): SalesOrderItem {
  const orderNo = normalizeString(base.orderNo);
  const orderDate = normalizeString(base.orderDate);
  const legacyDeliveryDate = normalizeString(base.deliveryDate);
  const customerName = normalizeString(base.customerName);
  const customerRegion = normalizeString(base.customerRegion) || undefined;
  const currency = normalizeString(base.currency);
  const note = normalizeString(base.note) || undefined;
  const paidDate = normalizeString(base.paidDate);

  const items = normalizeItems(base.items, legacyDeliveryDate);
  const status = normalizeStatus(base.status);
  const documentStatus = normalizeDocumentStatus(base.documentStatus);
  const orderAmount = items.reduce((sum, item) => sum + item.orderQuantity * item.unitPrice, 0);
  const paidAmount =
    typeof base.paidAmount === "number" && Number.isFinite(base.paidAmount)
      ? base.paidAmount
      : status.paid
        ? orderAmount
        : 0;
  const deliveryDate = getPrimaryDeliveryDate(items, legacyDeliveryDate);

  const orderNoLower = orderNo.toLowerCase();

  return {
    orgId,
    salesOrderId: base.salesOrderId,
    displayNo: base.displayNo,
    orderNo,
    orderDate,
    deliveryDate,
    paidAmount,
    paidDate,
    customerName,
    customerRegion,
    currency,
    note,
    items,
    status,
    documentStatus,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,

    orderDateIndexPk: orderDate ? orgId : undefined,
    orderDateIndexSk: orderDate || undefined,
    deliveryDateIndexPk: deliveryDate ? orgId : undefined,
    deliveryDateIndexSk: deliveryDate || undefined,
    customerIndexPk: customerName ? `${orgId}#${customerName}` : undefined,
    customerIndexSk: customerName ? orderDate : undefined,
    orderNoIndexPk: orderNo ? orgId : undefined,
    orderNoIndexSk: orderNo ? `${orderNoLower}#${base.salesOrderId}` : undefined,

    // スパース運用のため true のものだけ index 属性を付与する
    ...(status.shipped ? { shippedStatusIndexPk: orgId, shippedStatusIndexSk: deliveryDate || orderDate } : {}),
    ...(status.delivered ? { deliveredStatusIndexPk: orgId, deliveredStatusIndexSk: deliveryDate || orderDate } : {}),
    ...(status.paid ? { paidStatusIndexPk: orgId, paidStatusIndexSk: paidDate || orderDate } : {}),
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

export async function listSalesOrders(orgId: string): Promise<SalesOrderItem[]> {
  const TableName = SALES_ORDERS_TABLE_NAME;

  try {
    const res = await ddb.send(
      new QueryCommand({
        TableName,
        KeyConditionExpression: "orgId = :orgId",
        ExpressionAttributeValues: { ":orgId": orgId },
      }),
    );
    return (res.Items ?? []) as SalesOrderItem[];
  } catch (e) {
    console.warn("QueryCommand failed. Falling back to ScanCommand.", e);
    const res = await ddb.send(
      new ScanCommand({
        TableName,
        FilterExpression: "orgId = :orgId",
        ExpressionAttributeValues: { ":orgId": orgId },
      }),
    );
    return (res.Items ?? []) as SalesOrderItem[];
  }
}

export async function getSalesOrder(orgId: string, salesOrderId: string): Promise<SalesOrderItem | null> {
  const res = await ddb.send(
    new GetCommand({
      TableName: SALES_ORDERS_TABLE_NAME,
      Key: { orgId, salesOrderId },
    }),
  );
  return (res.Item ?? null) as SalesOrderItem | null;
}

export async function upsertSalesOrder(
  orgId: string,
  input: Partial<SalesOrderItem> & { salesOrderId?: string },
): Promise<SalesOrderItem> {
  const updatingId = input.salesOrderId?.trim() || "";
  const existing = updatingId ? await getSalesOrder(orgId, updatingId) : null;

  const updatedAt = nowIso();

  if (!existing) {
    const displayNo = await nextSequence(orgId, "SO");
    const salesOrderId = crypto.randomUUID();

    const item = buildSalesOrderItem(orgId, {
      ...input,
      salesOrderId,
      displayNo,
      createdAt: updatedAt,
      updatedAt,
    });

    await ddb.send(new PutCommand({ TableName: SALES_ORDERS_TABLE_NAME, Item: item }));
    return item;
  }

  const item = buildSalesOrderItem(orgId, {
    ...existing,
    ...input,
    salesOrderId: existing.salesOrderId,
    displayNo: existing.displayNo ?? 0,
    createdAt: existing.createdAt ?? updatedAt,
    updatedAt,
  });

  await ddb.send(new PutCommand({ TableName: SALES_ORDERS_TABLE_NAME, Item: item }));
  return item;
}

export async function deleteSalesOrder(orgId: string, salesOrderId: string): Promise<void> {
  await ddb.send(
    new DeleteCommand({
      TableName: SALES_ORDERS_TABLE_NAME,
      Key: { orgId, salesOrderId },
    }),
  );
}
