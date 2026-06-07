import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import { buildSecurityHeaderRoutes } from "./src/security-headers/security-headers";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-auth", "postgres"],
  turbopack: {
    resolveAlias: {
      "@better-auth/kysely-adapter": "./stubs/empty-kysely-adapter.mjs",
    },
  },
  async headers() {
    return buildSecurityHeaderRoutes();
  },
};

export default withSerwist(nextConfig);
