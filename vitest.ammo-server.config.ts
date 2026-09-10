import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/ammo-ledger/*.integration.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 30_000,
    maxWorkers: 1,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
