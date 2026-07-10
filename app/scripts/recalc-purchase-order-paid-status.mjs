#!/usr/bin/env node
/**
 * 発注の「支払い済み」ステータス再計算スクリプト（一括バックフィル用）
 *
 * 背景:
 * - server.ts の自動判定を「支払合計 >= 発注額」から「支払合計 >= 発注額の99.9%」に変更した
 *   （端数・丸め・浮動小数点誤差で実質完済が未払い扱いになるのを防ぐため）
 * - status.paid は保存時に計算されて DynamoDB に格納されるため、既存データは
 *   次に編集保存されるまで旧判定のまま残る。本スクリプトで一括再計算する。
 *
 * 対象: 支払い履歴（payments）が1件以上あり、発注額 > 0 のPOのみ
 *       （支払い履歴なしのPOは手動チェックが正なので触らない）
 *
 * 使い方:
 *   node scripts/recalc-purchase-order-paid-status.mjs --table masuda-vinyl-ops-purchase-orders-prod --region ap-southeast-1 --profile masuda-prod
 *   デフォルトは dry-run（変更内容の表示のみ）。実際に書き込むには --apply を付ける。
 *
 * Options:
 *   --table <name>       対象テーブル名（必須）
 *   --region <region>    リージョン（既定: ap-northeast-1）
 *   --profile <profile>  AWS shared config profile（既定: 環境変数 AWS_PROFILE）
 *   --apply              実際に更新を書き込む（付けない場合は dry-run）
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { fromIni } from "@aws-sdk/credential-provider-ini";

// server.ts の buildPurchaseOrderItem と同じ許容誤差（発注額の0.1%未満の差は完済とみなす）
const PAID_TOLERANCE_RATIO = 0.999;

function parseArgs(argv) {
  const args = { table: "", region: "ap-northeast-1", profile: process.env.AWS_PROFILE, apply: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--table" && argv[i + 1]) {
      args.table = argv[++i];
    } else if (a === "--region" && argv[i + 1]) {
      args.region = argv[++i];
    } else if (a === "--profile" && argv[i + 1]) {
      args.profile = argv[++i];
    } else if (a === "--apply") {
      args.apply = true;
    } else if (a === "--help" || a === "-h") {
      console.log("Options:\n  --table <name> (required)\n  --region <region>\n  --profile <profile>\n  --apply");
      process.exit(0);
    } else {
      throw new Error(`Unknown arg: ${a}`);
    }
  }
  if (!args.table) {
    throw new Error("--table is required");
  }
  return args;
}

const sumPayments = (payments) =>
  (Array.isArray(payments) ? payments : []).reduce((sum, payment) => sum + (typeof payment?.amount === "number" ? payment.amount : 0), 0);

async function main() {
  const args = parseArgs(process.argv);
  const ddb = DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region: args.region,
      credentials: args.profile ? fromIni({ profile: args.profile }) : undefined,
    }),
    { marshallOptions: { removeUndefinedValues: true } },
  );

  const items = [];
  let lastKey;
  do {
    const res = await ddb.send(new ScanCommand({ TableName: args.table, ExclusiveStartKey: lastKey }));
    items.push(...(res.Items ?? []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);

  console.log(`スキャン完了: ${items.length} 件`);

  const targets = [];
  for (const item of items) {
    const payments = Array.isArray(item.payments) ? item.payments : [];
    const amount = typeof item.amount === "number" ? item.amount : 0;
    if (payments.length === 0 || amount <= 0) {
      continue;
    }
    const currentPaid = Boolean(item.status?.paid);
    const nextPaid = sumPayments(payments) >= amount * PAID_TOLERANCE_RATIO;
    if (currentPaid !== nextPaid) {
      targets.push({ item, nextPaid });
    }
  }

  if (targets.length === 0) {
    console.log("再計算による変更対象はありません。");
    return;
  }

  console.log(`変更対象: ${targets.length} 件`);
  for (const { item, nextPaid } of targets) {
    console.log(
      `  ${item.poNo || "(PO No.なし)"} / 発注日 ${item.orderDate} / 発注額 ${item.amount} ${item.currency} / 支払合計 ${sumPayments(item.payments)} : paid ${Boolean(item.status?.paid)} -> ${nextPaid}`,
    );
  }

  if (!args.apply) {
    console.log("dry-run のため書き込みは行いません。実行するには --apply を付けてください。");
    return;
  }

  for (const { item, nextPaid } of targets) {
    // paidStatusIndex はスパース運用（true のものだけ属性を付与）のため、index 属性も同時に更新する
    const updateExpression = nextPaid
      ? "SET #status.paid = :paid, paidStatusIndexPk = :pk, paidStatusIndexSk = :sk, updatedAt = :now"
      : "SET #status.paid = :paid, updatedAt = :now REMOVE paidStatusIndexPk, paidStatusIndexSk";
    await ddb.send(
      new UpdateCommand({
        TableName: args.table,
        Key: { orgId: item.orgId, purchaseOrderId: item.purchaseOrderId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":paid": nextPaid,
          ":now": new Date().toISOString(),
          ...(nextPaid ? { ":pk": item.orgId, ":sk": item.orderDate ?? "" } : {}),
        },
      }),
    );
    console.log(`更新完了: ${item.purchaseOrderId}`);
  }
  console.log(`書き込み完了: ${targets.length} 件`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
