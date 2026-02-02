#!/usr/bin/env node
/**
 * Clear script for Products Master (製品マスタ) (dev only)
 * Fixed:
 * - region: ap-northeast-1
 * - table : masuda-vinyl-ops-products-master-dev
 *
 * Options:
 *   --dry-run
 *   --profile <profile>
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";

const REGION = "ap-northeast-1";
const TABLE_NAME = "masuda-vinyl-ops-products-master-dev";

function parseArgs(argv) {
  const args = { dryRun: false, profile: process.env.AWS_PROFILE };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (a === "--profile" && argv[i + 1]) {
      args.profile = argv[++i];
      continue;
    }
    if (a === "--help" || a === "-h") {
      console.log(`\nClear Products Master (製品マスタ) (dev)\n\nOptions:\n  --dry-run\n  --profile <profile>\n`);
      process.exit(0);
    }
    throw new Error(`Unknown arg: ${a}`);
  }
  return args;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function batchDeleteAll(ddbDoc, keys) {
  const batches = chunk(keys, 25);
  let deleted = 0;

  for (let bi = 0; bi < batches.length; bi++) {
    let requestItems = {
      [TABLE_NAME]: batches[bi].map((Key) => ({ DeleteRequest: { Key } })),
    };

    let attempt = 0;
    while (true) {
      attempt++;
      const res = await ddbDoc.send(new BatchWriteCommand({ RequestItems: requestItems }));
      const unp = res.UnprocessedItems?.[TABLE_NAME] ?? [];
      deleted += requestItems[TABLE_NAME].length - unp.length;

      if (!unp.length) {
        break;
      }

      if (attempt >= 10) {
        throw new Error(`UnprocessedItems remain after ${attempt} attempts: ${unp.length}`);
      }

      const backoff = Math.min(1000 * 2 ** (attempt - 1), 10_000) + Math.floor(Math.random() * 250);
      console.warn(`[${TABLE_NAME}] UnprocessedItems=${unp.length} retrying in ${backoff}ms (attempt ${attempt})`);
      requestItems = { [TABLE_NAME]: unp };
      await sleep(backoff);
    }

    process.stdout.write(`\r[${TABLE_NAME}] ${Math.min((bi + 1) * 25, keys.length)}/${keys.length} processed...`);
  }
  process.stdout.write("\n");
  return deleted;
}

async function scanAllKeys(ddbDoc) {
  const keys = [];
  let ExclusiveStartKey = undefined;

  while (true) {
    const res = await ddbDoc.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ProjectionExpression: "orgId, productId",
        ExclusiveStartKey,
      }),
    );

    for (const item of res.Items ?? []) {
      if (item?.orgId && item?.productId) {
        keys.push({ orgId: item.orgId, productId: item.productId });
      }
    }

    if (!res.LastEvaluatedKey) {
      break;
    }
    ExclusiveStartKey = res.LastEvaluatedKey;
  }

  return keys;
}

async function main() {
  const args = parseArgs(process.argv);

  const ddb = new DynamoDBClient({
    region: REGION,
    credentials: args.profile ? fromIni({ profile: args.profile }) : undefined,
  });
  const ddbDoc = DynamoDBDocumentClient.from(ddb, { marshallOptions: { removeUndefinedValues: true } });

  console.log("Clear target:");
  console.log(`- region: ${REGION}`);
  console.log(`- table : ${TABLE_NAME}`);

  console.log("\nScanning keys...");
  const keys = await scanAllKeys(ddbDoc);
  console.log(`Found items: ${keys.length}`);

  if (args.dryRun) {
    console.log("\n--dry-run: no deletes performed.");
    return;
  }

  if (keys.length === 0) {
    console.log("No items. skipped.");
    return;
  }

  console.log(`\nDeleting from ${TABLE_NAME} ...`);
  const deleted = await batchDeleteAll(ddbDoc, keys);
  console.log(`[${TABLE_NAME}] done. deleted=${deleted}`);
}

main().catch((e) => {
  console.error("\nClear failed:");
  console.error(e);
  process.exit(1);
});
