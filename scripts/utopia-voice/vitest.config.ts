import path from "node:path";
import { defineConfig } from "vitest/config";

// make-irodori-voice.ts を、サイトの読み上げと同じ合成のコードで動かすための設定（通常のテストには含めない）
export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/utopia-voice/make-irodori-voice.ts"],
    testTimeout: 30 * 60 * 1000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "../../src"),
    },
  },
});
