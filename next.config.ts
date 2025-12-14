import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // 修复 Next.js 16 params/searchParams Promise 序列化问题
  reactStrictMode: true,
};

export default nextConfig;
