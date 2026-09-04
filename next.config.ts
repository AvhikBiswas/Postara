import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16.3 + Vercel's adapter + standalone looks for next-server.js.nft.json
  // and fails the deploy (vercel/next.js#96646). Docker still needs standalone.
  output: process.env.VERCEL ? undefined : "standalone",
  serverExternalPackages: ["@prisma/client", "prisma", "bullmq", "ioredis"],
};

export default nextConfig;
