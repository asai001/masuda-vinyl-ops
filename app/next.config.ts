import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // サーバー側バンドルに含めない（実体をnode_modulesから参照させる）
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],

  outputFileTracingIncludes: {
    "/api/order-issue-pdf": ["./public/fonts/*.ttf", "./node_modules/@sparticuz/chromium/**", "./node_modules/puppeteer-core/**"],
  },
};

export default nextConfig;
