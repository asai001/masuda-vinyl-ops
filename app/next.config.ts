import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/order-issue-pdf": ["./public/fonts/*.ttf"],
  },
};

export default nextConfig;
