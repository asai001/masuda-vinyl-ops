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
import { listPaymentDefinitions } from "@/features/payment-master/api/server";
import {
  paymentStatusOptions,
  type NewPaymentManagementInput,
  type PaymentManagementItem,
  type PaymentStatusKey,
  type UpdatePaymentManagementInput,
} from "../types";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

const ROLE_ARN = requireEnv("AWS_ROLE_ARN");
const PAYMENTS_TABLE_NAME = requireEnv("PAYMENTS_TABLE_NAME");
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

const paymentStatusKeys = paymentStatusOptions.map((option) => option.key);
const defaultPaymentMethods = ["銀行振込", "口座振替", "現金", "クレジットカード"];
const defaultCurrencies = ["JPY", "USD", "VND"];

function nowIso() {
  return new Date().toISOString();
}

function toLowerSafe(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeStatus(value: unknown): PaymentStatusKey {
  return paymentStatusKeys.includes(value as PaymentStatusKey) ? (value as PaymentStatusKey) : "unpaid";
}

function deriveYearMonth(paymentDate: string | undefined, fallback?: string) {
  const trimmed = (paymentDate ?? "").trim();
  if (trimmed && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed.slice(0, 7);
  }
  return (fallback ?? "").trim();
}

function buildPaymentItem(
  orgId: string,
  base: Partial<PaymentManagementItem> & { paymentId: string; displayNo: number },
): PaymentManagementItem {
  const category = (base.category ?? "").trim();
  const content = (base.content ?? "").trim();
  const currency = (base.currency ?? "").trim();
  const paymentMethod = (base.paymentMethod ?? "").trim();
  const paymentDate = (base.paymentDate ?? "").trim();
  const note = base.note?.trim() || "";

  const yearMonth = deriveYearMonth(paymentDate, base.yearMonth);
  if (!yearMonth) {
    throw new Error("Invalid paymentDate");
  }

  const amount = typeof base.amount === "number" && Number.isFinite(base.amount) ? base.amount : 0;
  const status = normalizeStatus(base.status);
  const isFixedCost = Boolean(base.isFixedCost);

  const paymentMonthKey = `${orgId}#${yearMonth}`;
  const contentLower = toLowerSafe(content);

  return {
    orgId,
    paymentMonthKey,
    paymentId: base.paymentId,
    displayNo: base.displayNo,

    yearMonth,
    paymentDate,
    category,
    content,
    contentLower,
    amount,
    currency,
    paymentMethod,
    status,
    note,
    isFixedCost,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,

    ...(paymentDate
      ? {
          paymentDateIndexPk: paymentMonthKey,
          paymentDateIndexSk: paymentDate,
        }
      : {}),
    ...(category && paymentDate
      ? {
          monthCategoryIndexPk: `${paymentMonthKey}#${category}`,
          monthCategoryIndexSk: paymentDate,
        }
      : {}),
    ...(currency && paymentDate
      ? {
          monthCurrencyIndexPk: `${paymentMonthKey}#${currency}`,
          monthCurrencyIndexSk: paymentDate,
        }
      : {}),
    ...(paymentMethod && paymentDate
      ? {
          monthPaymentMethodIndexPk: `${paymentMonthKey}#${paymentMethod}`,
          monthPaymentMethodIndexSk: paymentDate,
        }
      : {}),
    ...(status && paymentDate
      ? {
          monthStatusIndexPk: `${paymentMonthKey}#${status}`,
          monthStatusIndexSk: paymentDate,
        }
      : {}),
    ...(typeof amount === "number"
      ? {
          monthAmountIndexPk: paymentMonthKey,
          monthAmountIndexSk: amount,
        }
      : {}),
    ...(content
      ? {
          monthContentIndexPk: paymentMonthKey,
          monthContentIndexSk: `${contentLower}#${base.paymentId}`,
        }
      : {}),
  };
}

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

export async function listPaymentsByMonth(orgId: string, yearMonth: string): Promise<PaymentManagementItem[]> {
  const paymentMonthKey = `${orgId}#${yearMonth.trim()}`;
  try {
    const res = await ddb.send(
      new QueryCommand({
        TableName: PAYMENTS_TABLE_NAME,
        KeyConditionExpression: "paymentMonthKey = :paymentMonthKey",
        ExpressionAttributeValues: { ":paymentMonthKey": paymentMonthKey },
      }),
    );
    return (res.Items ?? []) as PaymentManagementItem[];
  } catch (e) {
    console.warn("QueryCommand failed. Falling back to ScanCommand.", e);
    const res = await ddb.send(
      new ScanCommand({
        TableName: PAYMENTS_TABLE_NAME,
        FilterExpression: "paymentMonthKey = :paymentMonthKey",
        ExpressionAttributeValues: { ":paymentMonthKey": paymentMonthKey },
      }),
    );
    return (res.Items ?? []) as PaymentManagementItem[];
  }
}

export async function getPayment(
  orgId: string,
  yearMonth: string,
  paymentId: string,
): Promise<PaymentManagementItem | null> {
  const paymentMonthKey = `${orgId}#${yearMonth.trim()}`;
  const res = await ddb.send(
    new GetCommand({
      TableName: PAYMENTS_TABLE_NAME,
      Key: { paymentMonthKey, paymentId },
    }),
  );
  return (res.Item ?? null) as PaymentManagementItem | null;
}

export async function createPayment(
  orgId: string,
  input: NewPaymentManagementInput,
): Promise<PaymentManagementItem> {
  const displayNo = await nextSequence(orgId, "PAY");
  const paymentId = crypto.randomUUID();
  const updatedAt = nowIso();
  const item = buildPaymentItem(orgId, {
    ...input,
    paymentId,
    displayNo,
    createdAt: updatedAt,
    updatedAt,
  });

  await ddb.send(new PutCommand({ TableName: PAYMENTS_TABLE_NAME, Item: item }));
  return item;
}

export async function updatePayment(
  orgId: string,
  input: UpdatePaymentManagementInput,
): Promise<PaymentManagementItem> {
  const existing = await getPayment(orgId, input.yearMonth, input.paymentId);
  const updatedAt = nowIso();

  let displayNo = existing?.displayNo;
  if (typeof displayNo !== "number") {
    displayNo = await nextSequence(orgId, "PAY");
  }

  const item = buildPaymentItem(orgId, {
    ...existing,
    ...input,
    paymentId: input.paymentId,
    displayNo,
    createdAt: existing?.createdAt ?? updatedAt,
    updatedAt,
  });

  const originalYearMonth = (existing?.yearMonth ?? input.yearMonth).trim();
  if (originalYearMonth && originalYearMonth !== item.yearMonth) {
    const originalKey = `${orgId}#${originalYearMonth}`;
    await ddb.send(
      new DeleteCommand({
        TableName: PAYMENTS_TABLE_NAME,
        Key: { paymentMonthKey: originalKey, paymentId: input.paymentId },
      }),
    );
  }

  await ddb.send(new PutCommand({ TableName: PAYMENTS_TABLE_NAME, Item: item }));
  return item;
}

export async function deletePayment(orgId: string, yearMonth: string, paymentId: string): Promise<void> {
  const paymentMonthKey = `${orgId}#${yearMonth.trim()}`;
  await ddb.send(
    new DeleteCommand({
      TableName: PAYMENTS_TABLE_NAME,
      Key: { paymentMonthKey, paymentId },
    }),
  );
}

export async function generatePayments(orgId: string, yearMonth: string): Promise<PaymentManagementItem[]> {
  const [existingItems, paymentDefs] = await Promise.all([
    listPaymentsByMonth(orgId, yearMonth),
    listPaymentDefinitions(orgId),
  ]);

  const existingKeys = new Set(
    existingItems.map(
      (row) => `${(row.category ?? "").trim()}-${(row.content ?? "").trim()}-${row.paymentDate ?? ""}`,
    ),
  );

  const generated: PaymentManagementItem[] = [];
  for (const def of paymentDefs) {
    const legacyDay = (def as { paymentDay?: number }).paymentDay;
    const day = typeof def.paymentDate === "number" ? def.paymentDate : typeof legacyDay === "number" ? legacyDay : null;
    if (!day || day < 1 || day > 31) {
      continue;
    }

    const paymentDate = `${yearMonth}-${String(day).padStart(2, "0")}`;
    const category = (def.category ?? "").trim();
    const content = (def.content ?? "").trim();
    if (!category || !content) {
      continue;
    }

    const key = `${category}-${content}-${paymentDate}`;
    if (existingKeys.has(key)) {
      continue;
    }

    const displayNo = await nextSequence(orgId, "PAY");
    const paymentId = crypto.randomUUID();
    const amount =
      def.isFixedCost && typeof def.fixedAmount === "number" && Number.isFinite(def.fixedAmount)
        ? def.fixedAmount
        : 0;

    const currency = def.currency?.trim() || defaultCurrencies[0];
    const paymentMethod = def.paymentMethod?.trim() || defaultPaymentMethods[0];
    const now = nowIso();
    generated.push(
      buildPaymentItem(orgId, {
        paymentId,
        displayNo,
        category,
        content,
        amount,
        currency,
        paymentMethod,
        paymentDate,
        status: "unpaid",
        note: "",
        isFixedCost: Boolean(def.isFixedCost),
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  if (!generated.length) {
    return [];
  }

  await Promise.all(
    generated.map((item) => ddb.send(new PutCommand({ TableName: PAYMENTS_TABLE_NAME, Item: item }))),
  );

  return generated;
}
