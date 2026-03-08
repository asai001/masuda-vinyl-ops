import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // サーバー側バンドルに含めない（実体をnode_modulesから参照させる）
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "xlsx-populate"],

  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF:
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ?? process.env.VERCEL_GIT_COMMIT_REF,
  },

  outputFileTracingIncludes: {
    "/api/order-issue-pdf": ["./public/fonts/*.ttf", "./node_modules/@sparticuz/chromium/**", "./node_modules/puppeteer-core/**"],
    "/api/invoice-packing-list": ["./public/インボイスーパッキングリスト.xlsx", "./node_modules/xlsx-populate/**"],
  },
};

export default nextConfig;
