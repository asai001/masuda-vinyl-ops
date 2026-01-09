#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { InfraStack } from "../lib/infra-stack";

type DeployEnv = "dev" | "prod";

const resolveEnv = (value: string | undefined): DeployEnv => {
  if (value === "dev" || value === "prod") {
    return value;
  }
  throw new Error('デプロイ環境は "dev" または "prod" を指定してください。');
};

const app = new cdk.App();
// cdk -c env=dev|prod で環境を切り替える
const deployEnv = resolveEnv(
  app.node.tryGetContext("env") ?? process.env.DEPLOY_ENV
);

// .env を読み込んだ後に .env.dev を重ねる（OSの環境変数は上書きしない）
const loadEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  return dotenv.parse(fs.readFileSync(filePath, "utf8"));
};

const baseEnv = loadEnvFile(path.resolve(__dirname, "../.env"));
const envSpecific = loadEnvFile(
  path.resolve(__dirname, `../.env.${deployEnv}`)
);
const mergedEnv = { ...baseEnv, ...envSpecific };

// OS の環境変数が優先されるように、未設定のキーだけ反映する
for (const [key, value] of Object.entries(mergedEnv)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

const requireEnvVar = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`環境変数 ${key} が未設定です。`);
  }
  return value;
};

// 指定された環境だけ必須チェック
const getEnvConfig = (targetEnv: DeployEnv): cdk.Environment => {
  if (targetEnv === "dev") {
    return {
      account: requireEnvVar("DEV_AWS_ACCOUNT"),
      region: requireEnvVar("DEV_AWS_REGION"),
    };
  }
  return {
    account: requireEnvVar("PROD_AWS_ACCOUNT"),
    region: requireEnvVar("PROD_AWS_REGION"),
  };
};

const vercelEnvironment = deployEnv === "prod" ? "production" : "preview";

new InfraStack(app, `InfraStack-${deployEnv}`, {
  env: getEnvConfig(deployEnv),
  deployEnv,
  vercelEnvironment,
});
