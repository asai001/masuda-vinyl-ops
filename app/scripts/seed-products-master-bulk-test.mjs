#!/usr/bin/env node
/**
 * Seed script for Products Master (bulk test 100) (dev only)
 * Fixed:
 * - region: ap-northeast-1
 * - table : masuda-vinyl-ops-products-master-dev
 * - data  : ./test_products_master_bulk.json (relative to this script)
 *
 * Options:
 *   --dry-run
 *   --profile <profile>   (optional; otherwise uses AWS_PROFILE env var if set)
 */
import { readFile } from "node:fs/promises";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";

const REGION = "ap-northeast-1";
const TABLE_NAME = "masuda-vinyl-ops-products-master-dev";
const DATA_URL = new URL("./test_products_master_bulk.json", import.meta.url);

function parseArgs(argv) {
  const args = { dryRun: false, profile: process.env.AWS_PROFILE };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") { args.dryRun = true; continue; }
    if (a === "--profile" && argv[i + 1]) { args.profile = argv[++i]; continue; }
    if (a === "--help" || a === "-h") {
      console.log(`\nSeed Materials Master TEST (dev)\n\nOptions:\n  --dry-run\n  --profile <profile>\n`);
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

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function batchWriteAll(ddbDoc, items) {
  const batches = chunk(items, 25);
  let written = 0;

  for (let bi = 0; bi < batches.length; bi++) {
    let requestItems = {
      [TABLE_NAME]: batches[bi].map((Item) => ({ PutRequest: { Item } })),
    };

    let attempt = 0;
    while (true) {
      attempt++;
      const res = await ddbDoc.send(new BatchWriteCommand({ RequestItems: requestItems }));
      const unp = res.UnprocessedItems?.[TABLE_NAME] ?? [];
      written += requestItems[TABLE_NAME].length - unp.length;

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

    process.stdout.write(`\r[${TABLE_NAME}] ${Math.min((bi + 1) * 25, items.length)}/${items.length} processed...`);
  }
  process.stdout.write("\n");
  return written;
}

async function main() {
  const args = parseArgs(process.argv);

  const raw = await readFile(DATA_URL, "utf-8");
  const items = JSON.parse(raw);

  if (!Array.isArray(items)) {
    throw new Error("test_products_master_bulk.json must be a JSON array.");
  }

  console.log("Seed target:");
  console.log(`- region: ${REGION}`);
  console.log(`- table : ${TABLE_NAME}`);
  console.log(`- items : ${items.length}`);

  if (args.dryRun) {
    console.log("\n--dry-run: no writes performed.");
    return;
  }

  const ddb = new DynamoDBClient({
    region: REGION,
    credentials: args.profile ? fromIni({ profile: args.profile }) : undefined,
  });
  const ddbDoc = DynamoDBDocumentClient.from(ddb, { marshallOptions: { removeUndefinedValues: true } });

  if (items.length === 0) {
    console.log("No items. skipped.");
    return;
  }

  console.log(`\nSeeding ${TABLE_NAME} ...`);
  const written = await batchWriteAll(ddbDoc, items);
  console.log(`[${TABLE_NAME}] done. written=${written}`);
}

main().catch((e) => {
  console.error("\nSeed failed:");
  console.error(e);
  process.exit(1);
});
