import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";
import { ammoLedgerPwaConfig } from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout.trim() ||
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    additionalPrecacheEntries: [
      { url: ammoLedgerPwaConfig.startUrl, revision },
      { url: ammoLedgerPwaConfig.offlinePath, revision },
    ],
    swSrc: "src/sw.ts",
    useNativeEsbuild: true,
  },
);
