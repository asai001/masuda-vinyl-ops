import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
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

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION ?? "ap-northeast-1",
    ...(process.env.VERCEL ? { credentials: awsCredentialsProvider({ roleArn: ROLE_ARN }) } : {}),
  }),
  { marshallOptions: { removeUndefinedValues: true } },
);

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
