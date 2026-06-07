import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-auth", "postgres"],
  turbopack: {
    resolveAlias: {
      "@better-auth/kysely-adapter": "./stubs/empty-kysely-adapter.mjs",
    },
  },
};

export default withSerwist(nextConfig);
