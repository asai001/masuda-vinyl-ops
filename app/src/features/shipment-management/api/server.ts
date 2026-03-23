import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import { listSalesOrders, nextSequence } from "@/features/sales-management/api/server";
import type { SalesOrderItem } from "@/features/sales-management/types";
import { buildShipmentNo } from "@/features/shipment-management/shipmentUtils";
import type { NewShipmentInput, ShipmentAllocation, ShipmentItem, UpdateShipmentInput } from "../types";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

let cachedDdb: DynamoDBDocumentClient | null = null;

const getShipmentsTableName = () => requireEnv("SHIPMENTS_TABLE_NAME");

const getDdb = () => {
  if (cachedDdb) {
    return cachedDdb;
  }

  const roleArn = requireEnv("AWS_ROLE_ARN");
  cachedDdb = DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region: process.env.AWS_REGION ?? "ap-northeast-1",
      credentials: process.env.VERCEL
        ? awsCredentialsProvider({ roleArn })
        : fromIni({ profile: requireEnv("AWS_PROFILE") }),
    }),
    { marshallOptions: { removeUndefinedValues: true } },
  );

  return cachedDdb;
};

const nowIso = () => new Date().toISOString();
const normalizeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const normalizeNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const normalizeAllocations = (value: unknown): ShipmentAllocation[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const salesOrderId = normalizeString(record.salesOrderId);
      const lineItemId = normalizeNumber(record.lineItemId);
      const shippedQuantity = normalizeNumber(record.shippedQuantity);
      if (!salesOrderId || lineItemId <= 0 || shippedQuantity < 0) {
        return null;
      }
      return {
        id: normalizeNumber(record.id, index + 1),
        salesOrderId,
        lineItemId,
        shippedQuantity,
      };
    })
    .filter((entry): entry is ShipmentAllocation => entry !== null);
};

const buildLegacyShipmentQuantityMap = (order: SalesOrderItem) => {
  const quantities = new Map<number, number>();

  if (Array.isArray(order.shipments) && order.shipments.length > 0) {
    order.shipments.forEach((shipment) => {
      shipment.items.forEach((item) => {
        quantities.set(item.lineItemId, (quantities.get(item.lineItemId) ?? 0) + normalizeNumber(item.shippedQuantity));
      });
    });
    return quantities;
  }

  order.items.forEach((item) => {
    const shippedQuantity = Array.isArray(item.shipments)
      ? item.shipments.reduce((sum, shipment) => sum + normalizeNumber(shipment.shippedQuantity), 0)
      : normalizeNumber(item.shippedQuantity);
    if (shippedQuantity > 0) {
      quantities.set(item.id, shippedQuantity);
    }
  });

  return quantities;
};

const buildOtherShipmentQuantityMap = (shipments: ShipmentItem[]) => {
  const quantities = new Map<string, number>();
  shipments.forEach((shipment) => {
    (shipment.allocations ?? []).forEach((allocation) => {
      const key = `${allocation.salesOrderId}:${allocation.lineItemId}`;
      quantities.set(key, (quantities.get(key) ?? 0) + normalizeNumber(allocation.shippedQuantity));
    });
  });
  return quantities;
};

function buildShipmentItem(
  orgId: string,
  base: Partial<ShipmentItem> & { shipmentId: string; displayNo: number },
  salesOrders: SalesOrderItem[],
  otherShipments: ShipmentItem[],
): ShipmentItem {
  const deliveryDate = normalizeString(base.deliveryDate);
  if (!deliveryDate) {
    throw new Error("Delivery date is required");
  }

  const paidAmount = normalizeNumber(base.paidAmount);
  const paidDate = normalizeString(base.paidDate);
  if (paidAmount > 0 && !paidDate) {
    throw new Error("Paid date is required when paid amount is set");
  }

  const allocations = normalizeAllocations(base.allocations);
  if (!allocations.length) {
    throw new Error("Shipment allocations are required");
  }

  const salesOrderMap = new Map(salesOrders.map((order) => [order.salesOrderId, order]));
  const otherShipmentQuantities = buildOtherShipmentQuantityMap(otherShipments);
  const customerNames = new Set<string>();
  const currencies = new Set<string>();
  const customerRegions = new Set<string>();

  allocations.forEach((allocation, index) => {
    const order = salesOrderMap.get(allocation.salesOrderId);
    if (!order) {
      throw new Error(`Sales order not found: ${allocation.salesOrderId}`);
    }

    const item = order.items.find((lineItem) => lineItem.id === allocation.lineItemId);
    if (!item) {
      throw new Error(`Sales order line not found: ${allocation.salesOrderId}:${allocation.lineItemId}`);
    }

    const legacyQuantities = buildLegacyShipmentQuantityMap(order);
    const legacyQuantity = legacyQuantities.get(allocation.lineItemId) ?? 0;
    const otherShipmentQuantity = otherShipmentQuantities.get(`${allocation.salesOrderId}:${allocation.lineItemId}`) ?? 0;
    const availableQuantity = item.orderQuantity - legacyQuantity - otherShipmentQuantity;
    if (allocation.shippedQuantity > availableQuantity) {
      throw new Error(`Shipped quantity exceeds remaining order quantity: ${order.orderNo}/${item.productCode}`);
    }

    allocations[index] = {
      ...allocation,
      id: index + 1,
    };

    customerNames.add(normalizeString(order.customerName));
    currencies.add(normalizeString(order.currency));
    customerRegions.add(normalizeString(order.customerRegion));
  });

  const customerName = customerNames.values().next().value ?? "";
  const currency = currencies.values().next().value ?? "";
  const customerRegion = customerRegions.values().next().value ?? "";

  if (customerNames.size > 1) {
    throw new Error("A shipment cannot span multiple customers");
  }
  if (currencies.size > 1) {
    throw new Error("A shipment cannot span multiple currencies");
  }

  const shipmentNo = normalizeString(base.shipmentNo) || buildShipmentNo(base.displayNo);
  const invoiceNo = normalizeString(base.invoiceNo) || undefined;
  const note = normalizeString(base.note) || undefined;

  return {
    orgId,
    shipmentId: base.shipmentId,
    displayNo: base.displayNo,
    shipmentNo,
    invoiceNo,
    deliveryDate,
    paidDate: paidDate || undefined,
    paidAmount,
    note,
    customerName: customerName || undefined,
    customerRegion: customerRegion || undefined,
    currency: currency || undefined,
    allocations,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,

    deliveryDateIndexPk: orgId,
    deliveryDateIndexSk: `${deliveryDate}#${base.shipmentId}`,
    customerIndexPk: customerName ? `${orgId}#${customerName}` : undefined,
    customerIndexSk: customerName ? `${deliveryDate}#${base.shipmentId}` : undefined,
  };
}

export async function listShipmentItems(orgId: string): Promise<ShipmentItem[]> {
  const ddb = getDdb();
  const tableName = getShipmentsTableName();
  try {
    const response = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "orgId = :orgId",
        ExpressionAttributeValues: { ":orgId": orgId },
      }),
    );
    return (response.Items ?? []) as ShipmentItem[];
  } catch (error) {
    console.warn("Shipments QueryCommand failed. Falling back to ScanCommand.", error);
    const response = await ddb.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "orgId = :orgId",
        ExpressionAttributeValues: { ":orgId": orgId },
      }),
    );
    return (response.Items ?? []) as ShipmentItem[];
  }
}

export async function getShipmentItem(orgId: string, shipmentId: string): Promise<ShipmentItem | null> {
  const ddb = getDdb();
  const response = await ddb.send(
    new GetCommand({
      TableName: getShipmentsTableName(),
      Key: { orgId, shipmentId },
    }),
  );
  return (response.Item ?? null) as ShipmentItem | null;
}

export async function createShipment(orgId: string, input: NewShipmentInput): Promise<ShipmentItem> {
  const ddb = getDdb();
  const [displayNo, salesOrders, existingShipments] = await Promise.all([
    nextSequence(orgId, "SH"),
    listSalesOrders(orgId),
    listShipmentItems(orgId),
  ]);
  const shipmentId = crypto.randomUUID();
  const updatedAt = nowIso();
  const item = buildShipmentItem(
    orgId,
    {
      ...input,
      shipmentId,
      displayNo,
      createdAt: updatedAt,
      updatedAt,
    },
    salesOrders,
    existingShipments,
  );

  await ddb.send(new PutCommand({ TableName: getShipmentsTableName(), Item: item }));
  return item;
}

export async function updateShipment(orgId: string, input: UpdateShipmentInput): Promise<ShipmentItem> {
  const ddb = getDdb();
  const [existing, salesOrders, existingShipments] = await Promise.all([
    getShipmentItem(orgId, input.shipmentId),
    listSalesOrders(orgId),
    listShipmentItems(orgId),
  ]);

  if (!existing) {
    throw new Error("Shipment not found");
  }

  const updatedAt = nowIso();
  const item = buildShipmentItem(
    orgId,
    {
      ...existing,
      ...input,
      shipmentId: existing.shipmentId,
      displayNo: existing.displayNo ?? (await nextSequence(orgId, "SH")),
      createdAt: existing.createdAt ?? updatedAt,
      updatedAt,
    },
    salesOrders,
    existingShipments.filter((shipment) => shipment.shipmentId !== existing.shipmentId),
  );

  await ddb.send(new PutCommand({ TableName: getShipmentsTableName(), Item: item }));
  return item;
}

export async function deleteShipment(orgId: string, shipmentId: string): Promise<void> {
  const ddb = getDdb();
  await ddb.send(
    new DeleteCommand({
      TableName: getShipmentsTableName(),
      Key: { orgId, shipmentId },
    }),
  );
}
