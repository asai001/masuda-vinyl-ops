#!/usr/bin/env node
/**
 * DynamoDB seed script (AWS SDK v3) - ESM
 *
 * - Reads dummy data JSON
 * - BatchWrite (25 items per request) with retry for UnprocessedItems
 *
 * Usage:
 *   node scripts/seed-dynamodb.mjs --stage dev --prefix masuda-vinyl-ops --data ./dynamodb_dummy_data.json
 *
 * If your actual table names differ from `${prefix}-${entity}-${stage}`,
 * pass overrides via --table <alias>=<tableName>.
 * Example:
 *   node scripts/seed-dynamodb.mjs --data ./dynamodb_dummy_data.json --table clients=actual-clients-dev
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";

function parseArgs(argv) {
  const args = {
    dataPath: "./dynamodb_dummy_data.json",
    stage: process.env.STAGE ?? "dev",
    prefix: process.env.TABLE_PREFIX ?? "masuda-vinyl-ops",
    region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION,
    profile: process.env.AWS_PROFILE,
    dryRun: false,
    tableOverrides: {},
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--data" && argv[i + 1]) {
      args.dataPath = argv[++i];
      continue;
    }
    if (a === "--stage" && argv[i + 1]) {
      args.stage = argv[++i];
      continue;
    }
    if (a === "--prefix" && argv[i + 1]) {
      args.prefix = argv[++i];
      continue;
    }
    if (a === "--region" && argv[i + 1]) {
      args.region = argv[++i];
      continue;
    }
    if (a === "--profile" && argv[i + 1]) {
      args.profile = argv[++i];
      continue;
    }

    if (a === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (a === "--table" && argv[i + 1]) {
      const kv = argv[++i];
      const eq = kv.indexOf("=");
      if (eq === -1) throw new Error(`--table expects <alias>=<tableName>. got: ${kv}`);
      const alias = kv.slice(0, eq).trim();
      const name = kv.slice(eq + 1).trim();
      if (!alias || !name) throw new Error(`--table expects <alias>=<tableName>. got: ${kv}`);
      args.tableOverrides[alias] = name;
      continue;
    }
    if (a === "--help" || a === "-h") {
      printHelpAndExit();
    }
    throw new Error(`Unknown arg: ${a}\nUse --help to see usage.`);
  }
  return args;
}

function printHelpAndExit() {
  console.log(`
Seed DynamoDB tables from dummy JSON.

Options:
  --data   <path>            Dummy JSON path (default: ./dynamodb_dummy_data.json)
  --stage  <stage>           Stage suffix for table names (default: dev)
  --prefix <prefix>          Table name prefix (default: masuda-vinyl-ops)
  --region <region>          AWS region (default: AWS_REGION/AWS_DEFAULT_REGION)
  --table  <alias>=<name>    Override table name for an entity (repeatable)
  --dry-run                  Do not write; only print counts
  -h, --help                 Show help

Table name default rule:
  <prefix>-<entity>-<stage>
  entity is the dummy key with "_" replaced by "-"
`);
  process.exit(0);
}

function entityToTableSuffix(entity) {
  return entity.replaceAll("_", "-");
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function batchWriteAll(ddbDoc, tableName, items) {
  const batches = chunk(items, 25);
  let written = 0;

  for (let bi = 0; bi < batches.length; bi++) {
    let requestItems = {
      [tableName]: batches[bi].map((Item) => ({ PutRequest: { Item } })),
    };

    let attempt = 0;
    while (true) {
      attempt++;
      const res = await ddbDoc.send(new BatchWriteCommand({ RequestItems: requestItems }));
      const unp = res.UnprocessedItems && res.UnprocessedItems[tableName] ? res.UnprocessedItems[tableName] : [];
      written += requestItems[tableName].length - unp.length;

      if (!unp.length) break;

      if (attempt >= 10) {
        throw new Error(
          `BatchWrite still has UnprocessedItems after ${attempt} attempts. table=${tableName} batch=${bi + 1}/${batches.length}`
        );
      }

      const backoff = Math.min(1000 * 2 ** (attempt - 1), 10_000) + Math.floor(Math.random() * 250);
      console.warn(`[${tableName}] UnprocessedItems=${unp.length} retrying in ${backoff}ms (attempt ${attempt})`);
      requestItems = { [tableName]: unp };
      await sleep(backoff);
    }

    process.stdout.write(`\r[${tableName}] ${Math.min((bi + 1) * 25, items.length)}/${items.length} items processed...`);
  }
  process.stdout.write("\n");
  return written;
}

async function main() {
  const args = parseArgs(process.argv);
  const dataPath = resolve(process.cwd(), args.dataPath);

  const rawText = await readFile(dataPath, "utf-8");
  const parsed = JSON.parse(rawText);
  const tables = parsed && parsed.tables ? parsed.tables : parsed;

  const entries = Object.entries(tables);
  if (!entries.length) {
    console.log("No tables found in dummy data.");
    return;
  }

  console.log("Seed target:");
  for (const [entity, items] of entries) {
    const tableName = args.tableOverrides[entity] ?? `${args.prefix}-${entityToTableSuffix(entity)}-${args.stage}`;
    console.log(`- ${entity} -> ${tableName} (${items.length} items)`);
  }

  if (args.dryRun) {
    console.log("\n--dry-run: no writes performed.");
    return;
  }

  const ddb = new DynamoDBClient({
    region: args.region,
    credentials: args.profile ? fromIni({ profile: args.profile }) : undefined,
  });

  const ddbDoc = DynamoDBDocumentClient.from(ddb, { marshallOptions: { removeUndefinedValues: true } });

  let totalWritten = 0;
  for (const [entity, items] of entries) {
    const tableName = args.tableOverrides[entity] ?? `${args.prefix}-${entityToTableSuffix(entity)}-${args.stage}`;

    if (!items.length) {
      console.log(`[${tableName}] skipped (0 items)`);
      continue;
    }

    console.log(`\nSeeding ${tableName} ...`);
    const written = await batchWriteAll(ddbDoc, tableName, items);
    totalWritten += written;
    console.log(`[${tableName}] done. written=${written}`);
  }

  console.log(`\nAll done. totalWritten=${totalWritten}`);
}

main().catch((e) => {
  console.error("\nSeed failed:");
  console.error(e);
  process.exit(1);
});
