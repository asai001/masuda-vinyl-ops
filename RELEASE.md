# リリース手順書（feature/feedback-20260308 → main）

自分用メモ。発注管理の PO No.・分割支払い・収支集計の支出明細フィルタ等を含む `feature/feedback-20260308` を本番にリリースする際の手順。

## 変更概要

origin/main に対して 20 コミット前後の差分。主な変更：

- 出荷管理画面（`/shipment-management`）の新規追加
- 収支集計画面（`/finance-summary`）の新規追加
- 発注管理：PO No. 追加・分割支払い管理機能追加
- 収支集計：支出明細のカテゴリ複数選択フィルタ追加・支払日基準計上ロジック
- 標準カテゴリ・支払方法等のベトナム語翻訳追加
- インボイス・パッキングリストの HQ 用 14 品以上で別シート分割
- 注文書の Excel 化・プレビュー

## 影響範囲

| 項目 | 内容 |
| --- | --- |
| 新規 DynamoDB テーブル | `shipments`（CDK で作成必要） |
| 新規環境変数 | `SHIPMENTS_TABLE_NAME`（**コードでフォールバック対応済みのため設定不要**） |
| 既存テーブル変更 | なし（既存レコードは fallback ロジックで読み込み可能） |
| Vercel デプロイ | main マージで自動デプロイ |

## 前提

- 先方 AWS アカウント（PROD_AWS_ACCOUNT=859690632026）に CDK デプロイできる IAM ユーザーが付与されている
- ローカルの AWS CLI で対象アカウントに切り替えできる
- ローカルが `feature/feedback-20260308` ブランチで origin と同期している

## リリース手順

### 1. CDK デプロイ（shipments テーブル作成）

```bash
# infra ディレクトリで作業
cd infra

# 差分確認（shipments テーブル含む 1 個の新規リソースが出るはず）
npm run cdk:diff:prod -w infra

# 問題なければデプロイ
npm run cdk:deploy:prod -w infra
```

確認：

- AWS コンソール → DynamoDB → テーブル一覧に `masuda-vinyl-ops-shipments-prod` が作成されている
- GSI（`ShipmentsByDeliveryDateIndex`、`ShipmentsByCustomerIndex`）も作成されている

> ⚠️ Vercel 側の環境変数 `SHIPMENTS_TABLE_NAME` は **追加しない**。コード側で `PURCHASE_ORDERS_TABLE_NAME` から推測するフォールバック実装が入っているため。

### 2. PR 作成・マージ

```bash
git checkout feature/feedback-20260308
git pull origin feature/feedback-20260308

# PR 作成（GitHub 上で）
# base: main, compare: feature/feedback-20260308
```

PR タイトル例：`feature/feedback-20260308 をリリース`

PR 本文例：

```
## 主な変更
- 出荷管理画面・収支集計画面の追加
- 発注管理に PO No. と分割支払い管理機能を追加
- 収支集計：支出明細のカテゴリフィルタ・支払日基準計上
- ベトナム語翻訳の拡充

## 事前作業
- [x] CDK デプロイで shipments テーブル作成済み
- [ ] このPRをマージで Vercel が自動デプロイ
```

レビュー後 main にマージ。

### 3. Vercel 自動デプロイの完了を確認

- Vercel ダッシュボード（先方アカウント）でデプロイ完了を確認
- もしくは https://masuda-vinyl-ops-app-topaz.vercel.app/dashboard にアクセスして反映を確認

### 4. 動作確認（簡易スモークテスト）

最低限以下を確認：

- [ ] https://masuda-vinyl-ops-app-topaz.vercel.app/ にアクセス
- [ ] ログインできる
- [ ] ダッシュボード（トップページ）が表示される
- [ ] サイドメニューに「出荷管理」「収支集計」が追加されている

詳細な機能確認は先方にも軽く触ってもらう想定。

## ロールバック手順

何らかの理由で本番に問題が出た場合の戻し方。

### A. アプリケーションだけ戻す（推奨）

データを残したまま、コードだけ前の状態に戻す：

```bash
# main に戻って、マージ前のコミットを特定
git checkout main
git log --oneline -5

# 直前のマージコミットを revert
git revert -m 1 <マージコミットSHA>
git push origin main
```

→ Vercel が自動的に旧バージョンを再デプロイする。

> 新機能で書き込まれた `poNo` / `payments` / `shipments` データは DynamoDB に残るが、旧コードでは単に無視されるだけで壊れない。

### B. Vercel ダッシュボードから即時切り戻し

緊急時はマージ revert を待たず、Vercel ダッシュボードの **Deployments → 前のデプロイの "..." → Promote to Production** で即座に旧バージョンに戻せる（先方アカウントなのでアクセスできるなら）。

### C. インフラ（shipments テーブル）の扱い

- 通常はテーブルを **残す**（消すとデータ消失リスク。空テーブルなら害もない）
- どうしても削除したい場合：
  - `removalPolicy` は `prod` で `RETAIN` 設定なので、CDK でスタックから外しても物理削除されない
  - 完全削除する場合は AWS コンソール経由で手動削除

## 注意点

### 既存データへの影響

- 既存の発注データには `poNo` も `payments` も無いが、フロント側で空文字 / 空配列にフォールバックされるので壊れない
- 既存で「支払い済み」チェックを入れただけの発注は、新システムでも引き続き「支払い済み」表示
- ただし **既存POに分割支払いを途中から追加すると、合計支払額 < 発注額の間は「未払い」自動切替**（仕様通り）

### 収支集計の挙動変化

- 発注に支払い履歴が **無い** → 従来通り発注日基準で支出計上
- 発注に支払い履歴が **あり** → 支払日基準（各支払い1件ずつ）で計上、残額分は計上されない
- → 同じ発注でも、支払い登録前後で集計画面の月次集計が変わる可能性あり

### カスタムカテゴリの翻訳

- シードデータの標準カテゴリ（経費 / 人件費 / 材料費 等）は翻訳辞書に登録済み
- 先方が独自に追加した未登録カテゴリは VN モードでも日本語表示のまま
- 必要に応じて `app/src/lib/i18n/language.tsx` の `phraseMessages` に追記

## 参考

- 互換性詳細：このブランチの会話履歴参照
- CDK 命名規則：`${prefix}-${tableName}-${stage}`（[infra/lib/dynamodb.ts](infra/lib/dynamodb.ts)）
- フォールバック実装：[app/src/features/shipment-management/api/server.ts](app/src/features/shipment-management/api/server.ts) の `getShipmentsTableName`
