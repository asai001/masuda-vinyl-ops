# masuda-vinyl-ops

増田ビニール向け業務運用システム（Ops）のリポジトリです。
Next.js（アプリ）と AWS CDK（インフラ）を **1 つのリポジトリ** で管理し、環境（dev / prod）はデプロイ先・設定で分離します。

## 構成

```text
masuda-vinyl-ops
├ app/        # Next.js アプリケーション
├ infra/      # AWS CDK (TypeScript)
├ .gitignore
├ package.json
├ package-lock.json
├ README.md
└ tsconfig.base.json
```

## 前提

- Node.js（推奨: LTS）
- npm
- （infra を触る場合）AWS CLI の認証済みプロファイル、または SSO 等

## npm workspaces について

本リポジトリは npm workspaces を利用します。
依存関係のインストールは **ルートで一括** で行います。

```bash
npm install
```

workspace を指定してコマンドを実行する場合は `-w` を使います。

```bash
npm run dev -w app
npm run build -w app

npm run cdk -w infra
```

> ※ ルート `package.json` に集約スクリプト（`dev`, `cdk:deploy:dev` など）を定義して、基本はルートから叩く運用を推奨します。

## 開発（app）

```bash
npm install
npm run dev -w app
```

ブラウザでローカル起動先にアクセスしてください（app 側の設定に依存します）。

## インフラ（infra）

CDK の差分確認・デプロイは、まず `diff` → `deploy` の流れを推奨します。

```bash
npm run cdk:diff:dev -w infra
npm run cdk:deploy:dev -w infra
```

> ※ 実際のコマンド名は `infra/package.json` の scripts に合わせてください。

## 環境（dev / prod）の考え方

- リポジトリは 1 つのまま
- 環境は以下で分けます

  - デプロイ先（AWS アカウント / スタック / リソース）
  - 環境変数（GitHub Environments や SSM / Secrets Manager など）
  - ブランチ運用（例：main=prod / develop=dev）

### 推奨ブランチ運用（例）

- `develop` → 開発環境（dev）
- `main` → 本番環境（prod）

## ルール（おすすめ）

- `.env` はコミットしない（`.env.example` を用意して共有）
- 本番相当データは dev で使わない（DB やバケットは分離）
- インフラ変更は必ず `diff` を取ってからデプロイする

## License

TBD
