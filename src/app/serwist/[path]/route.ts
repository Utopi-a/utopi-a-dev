import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";
import { ammoLedgerPwaConfig } from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout.trim() ||
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    // 認証が必要な開始ページは事前保存せず、公開のオフライン案内だけを保存する。
    additionalPrecacheEntries: [{ url: ammoLedgerPwaConfig.offlinePath, revision }],
    swSrc: "src/sw.ts",
    useNativeEsbuild: true,
    globIgnores: [
      "**/node_modules/**/*",
      "public/forms/**",
      "public/opengraph-image.jpg",
      "public/screenshots/**",
    ],
  },
);
