import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by Prisma Compute — Next.js deploys fail without it
  output: "standalone",
};

export default nextConfig;
