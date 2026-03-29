import type { NextConfig } from "next";

// Coolify/Docker may set NEXTAUTH_URL="" — NextAuth then throws `new URL("")` during prerender
const nextAuthUrl = process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000";
process.env.NEXTAUTH_URL = nextAuthUrl;
if (!process.env.NEXTAUTH_SECRET?.trim()) {
  process.env.NEXTAUTH_SECRET =
    "build-placeholder-secret-change-in-production-min-32-chars";
}

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
