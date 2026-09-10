import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)) {
  throw new Error("PLAYWRIGHT_BASE_URL に専用ローカルアプリの URL を指定してください。");
}
if (!process.env.E2E_DATABASE_URL) {
  throw new Error("E2E_DATABASE_URL に専用ローカル PostgreSQL を指定してください。");
}

export default defineConfig(baseConfig, {
  testDir: "./e2e/ammo-ledger",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // 書込を伴う契約テストは、明示的に用意したローカルアプリでのみ実行する。
  webServer: undefined,
  use: { ...baseConfig.use, baseURL },
});
