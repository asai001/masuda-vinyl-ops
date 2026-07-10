# リリース手順書

自分用メモ。本番デプロイ作業時の手順とトラブルシュート集。

## 本番環境の基本構成

| 項目 | 内容 |
| --- | --- |
| 本番 URL | https://masuda-vinyl-ops-app-topaz.vercel.app/ |
| デプロイ先 | 先方Vercelチーム `masuda`（Pro）／プロジェクト `masuda-vinyl-ops-app` |
| デプロイ方式 | **GitHub Actions → Vercel CLI**（Vercel 側 Git 自動デプロイは `main` のみスキップ設定済み） |
| 本番AWS | アカウント `859690632026` / リージョン `ap-southeast-1` |
| 本番ブランチ | `main`（`main` への push で本番反映） |

## ブランチ運用

```
feature/xxx ─PR→ develop ─リリースPR(release/YYYYMMDD)→ main
                                                          ↓ Vercel本番デプロイ
```

- 直接 `main` への push はせず、必ず PR 経由
- 過去に feature → main 直接マージで develop が取り残された経緯あり。要注意
- 動作確認は **自分のVercel preview**（`masuda-vinyl-ops-app.vercel.app`）で行う

## 通常リリース手順

### 1. 事前確認

- [ ] 自分の feature ブランチでローカル動作確認済み
- [ ] feature → develop に PR マージ済み
- [ ] develop で動作確認済み（preview 環境）
- [ ] 必要なら CDK のインフラ変更を事前デプロイ済み（新規テーブル追加時など）

### 2. 本番リリース PR 作成

GitHub 上で：

- base: `main` ← compare: `develop`（または `release/YYYYMMDD` ブランチ）
- タイトル: `リリース/YYYYMMDD` 等
- 本文に主な変更点と事前作業チェックリストを記載

### 3. PR をマージ

`main` にマージすると、自動で：

1. **GitHub Actions の Deploy ワークフローが起動**（[.github/workflows/deploy-production.yml](.github/workflows/deploy-production.yml)）
2. Vercel CLI で `pull → build → deploy --prod`
3. 先方Vercelの本番 URL に反映

Vercel 側の Git 自動デプロイは `main` ではスキップ設定（Ignored Build Step）なので二重ビルドは起きない。

### 4. デプロイ完了確認

#### GitHub Actions 側

- リポジトリの **Actions タブ** → `Deploy to Vercel Production` が緑チェックになるのを確認
- 失敗時は赤マーク。クリックしてログ確認

#### Vercel 側（先方Vercel）

- 先方Vercel にログイン（Viewer 権限で OK）→ プロジェクト `masuda-vinyl-ops-app` → Deployments タブで新規 Production が `Ready` になっているか
- 自分は Viewer 権限なので閲覧のみ。何か操作したい場合は CLI / GitHub Actions 経由で

#### 動作確認（簡易スモークテスト）

- [ ] https://masuda-vinyl-ops-app-topaz.vercel.app/ に **シークレットウィンドウ** でアクセス
- [ ] ログインできる
- [ ] サイドメニューに想定通りのページがある
- [ ] 主要画面（ダッシュボード）が表示される

## 緊急時：手動デプロイ

GitHub Actions が反応しない、または特定のコミットを即座にデプロイしたい場合：

### 方法 A: GitHub Actions を手動実行

1. GitHub リポジトリ → **Actions タブ**
2. 左メニュー `Deploy to Vercel Production`
3. 右上 **Run workflow** → `main` ブランチを選んで実行

### 方法 B: 空コミットを push

```bash
git checkout main
git pull origin main
git commit --allow-empty -m "Trigger Vercel deploy"
git push origin main
```

→ GitHub Actions が起動する。

### 方法 C: ローカルから Vercel CLI 直接

最終手段。Vercel Token を持っている前提：

```bash
cd app
vercel pull --yes --environment=production --token=<VERCEL_TOKEN>
vercel build --prod --token=<VERCEL_TOKEN>
vercel deploy --prebuilt --prod --token=<VERCEL_TOKEN>
```

## インフラ変更（CDK）を伴うリリース

DynamoDB テーブル追加等のインフラ変更がある場合は、**アプリデプロイの前に** CDK デプロイを済ませる。

### 手順

```bash
cd infra
$env:AWS_PROFILE = "masuda-prod"  # PowerShell
# または: export AWS_PROFILE=masuda-prod  # bash
npx cdk diff -c env=prod
# 想定通りなら
npx cdk deploy -c env=prod
```

- AWS_PROFILE は `masuda-prod`（先方の本番アカウント 859690632026 を指す SSO プロファイル）
- リージョンは `ap-southeast-1`
- 事前に `aws sso login --sso-session masuda-prod` で SSO 認証が必要

### 環境変数の追加が必要な場合

新しいテーブル追加で `XXX_TABLE_NAME` 環境変数が必要になる場合：

- **基本方針：env var 追加を避けるためにコード側でフォールバック実装** する（[shipment-management/api/server.ts](app/src/features/shipment-management/api/server.ts) の `getShipmentsTableName` 参照）
- フォールバックで対応できない場合のみ、Vercel CLI 経由で追加：
  ```bash
  vercel env add NEW_TABLE_NAME production --token=<VERCEL_TOKEN>
  ```

## ロールバック手順

問題が起きた場合の戻し方。優先順は A → B → C。

### A. Vercel ダッシュボードから即時ロールバック（推奨）

1. 先方Vercel → プロジェクト → Deployments タブ
2. 前回成功していたデプロイの「...」メニュー → **Promote to Production**
3. 即座に旧バージョンが本番に反映される

> 自分は Viewer 権限なのでこの操作はできない。先方に依頼するか、別途 Vercel CLI で実行：
> ```bash
> vercel rollback <deployment-url> --token=<VERCEL_TOKEN>
> ```

### B. main を revert して push

コード側に問題がある場合：

```bash
git checkout main
git log --oneline -5  # マージコミット特定
git revert -m 1 <マージコミットSHA>
git push origin main
```

→ GitHub Actions が旧コードを再デプロイ。

### C. インフラ（CDK）の扱い

- 通常は **テーブルを残す**（消すとデータ消失リスク）
- 本番 `prod` の `removalPolicy` は `RETAIN` 設定なので、CDK スタックから外しても物理削除されない
- どうしても削除したい場合は AWS コンソール経由で手動削除

## トラブルシュート

### Vercel に反映されない

過去に発生したケース：

1. **GitHub Actions が起動しない** → リポジトリ Settings → Actions が enabled か確認
2. **GitHub Actions が失敗** → Actions タブのログを確認。よくある原因：
   - `VERCEL_TOKEN` 期限切れ → 新規発行して GitHub Secrets 更新
   - `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` が変更された → 新しい値で更新
   - ビルドエラー（依存関係、TypeScript 等） → ローカルで再現確認
3. **GitHub Actions 成功なのに反映されない** → 先方Vercelの Deployments で実際のデプロイが走ったか確認。ブラウザキャッシュも疑う

### 過去の事故事例

- **2026-05 頃**：Vercel の GitHub 連携が Mar 30 頃に webhook 配信不能になり、PR をマージしてもデプロイが走らない状態に → 先方Vercelで Git 再接続＋GitHub Actions 経由のデプロイに切り替えて解決
- **同時期**：feature/feedback-20260308 を develop を経由せず main に直接マージしてしまい、develop が古いままになる事故。以降は **feature → develop → release PR → main** の運用を徹底

### Vercel 周りで困ったら

- 自分の Vercel 権限は **Viewer**（先方チーム `masuda`）
- 操作したい場合は GitHub Actions / Vercel CLI を使う
- どうしても UI 操作が必要なら、先方に「Member に昇格」を依頼（追加課金 $20/月）

## 注意点（業務挙動）

### 既存データへの影響

- 既存の発注データには `poNo` も `payments` も無いが、フロント側で空文字 / 空配列にフォールバックされるので壊れない
- 既存で「支払い済み」チェックを入れただけの発注は、新システムでも引き続き「支払い済み」表示
- ただし **既存POに分割支払いを途中から追加すると、合計支払額 < 発注額の間は「未払い」自動切替**（仕様通り）

### 収支集計の挙動（2026-07 発注/支払 分離後）

先方要望（発注した金額と実際に支払った金額を分けたい）により、支出は「発注金額」と「支払金額」の2軸に分離。仕様は先方と合意済み（2026-07 メール）。

- **発注金額**（発注日ベース）: 発注書送付済みPOの発注金額全額。支払い登録の有無に関わらず常に全額計上
- **支払金額**（支払日ベース）: POの支払い履歴（各支払い1件ずつ）＋支払い管理の「支払済み」行。**未払いは含まない**（旧「支出」は未払いも含んでいたため、数字が旧表示より減って見えることがある）
- 支払い履歴なしで「支払い済み」チェックのみのPO → 発注日の日付で支払金額に計上（経過措置・先方合意済み）
- 収支差額は「売上−発注」「入金−支払」の2種類
- カテゴリ別支出タブは支払金額ベース
- POの「支払い済み」自動判定に許容誤差を追加: 支払合計が発注額の**99.9%以上**なら完済扱い（端数・丸め誤差対策）

### 発注/支払 分離リリース時の作業

- `status.paid` は保存時計算のため、許容誤差の変更は既存データに自動反映されない。リリース後に一括再計算を実行する:
  ```bash
  cd app
  node scripts/recalc-purchase-order-paid-status.mjs --table masuda-vinyl-ops-purchase-orders-prod --region ap-southeast-1 --profile masuda-prod          # dry-run
  node scripts/recalc-purchase-order-paid-status.mjs --table masuda-vinyl-ops-purchase-orders-prod --region ap-southeast-1 --profile masuda-prod --apply  # 本実行
  ```
- 2026-07-10 の dry-run では、端数差で「実質完済なのに未払い扱い」のPOが4件（CHT-003 / CHT-004 / 4-13登録のVND発注 / PV-015 NK 04-26）→ 上記スクリプトで解消される想定
- 期間収支グラフの選択状態は localStorage に保存されているが、旧キー値（`expense` 等）は無効値としてデフォルトに戻る（対応不要）

### カスタムカテゴリの翻訳

- シードデータの標準カテゴリ（経費 / 人件費 / 材料費 等）は翻訳辞書に登録済み
- 先方が独自に追加した未登録カテゴリは VN モードでも日本語表示のまま
- 必要に応じて [app/src/lib/i18n/language.tsx](app/src/lib/i18n/language.tsx) の `phraseMessages` に追記

## 参考

- GitHub Actions ワークフロー：[.github/workflows/deploy-production.yml](.github/workflows/deploy-production.yml)
- GitHub Secrets：`VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`
- CDK 命名規則：`${prefix}-${tableName}-${stage}`（[infra/lib/dynamodb.ts](infra/lib/dynamodb.ts)）
- フォールバック実装：[app/src/features/shipment-management/api/server.ts](app/src/features/shipment-management/api/server.ts) の `getShipmentsTableName`
