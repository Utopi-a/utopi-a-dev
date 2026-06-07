import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { shouldGuardAmmoLedgerLayout } from "@/features/ammo-ledger/auth/should-guard-ammo-ledger-layout/should-guard-ammo-ledger-layout";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerShell } from "@/features/ammo-ledger/components/ammo-ledger-shell/ammo-ledger-shell";
import {
  ammoLedgerPwaConfig,
  ammoLedgerPwaIcons,
} from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import { AmmoLedgerWorkspacePrefetch } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-prefetch/ammo-ledger-workspace-prefetch";

export const metadata: Metadata = {
  applicationName: ammoLedgerPwaConfig.shortName,
  title: ammoLedgerPwaConfig.name,
  description: ammoLedgerPwaConfig.description,
  manifest: ammoLedgerPwaConfig.manifestPath,
  icons: {
    icon: [
      {
        url: ammoLedgerPwaIcons[192],
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: ammoLedgerPwaIcons[512],
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: ammoLedgerPwaIcons[180],
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: ammoLedgerPwaConfig.shortName,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: ammoLedgerPwaConfig.themeColor,
};

export default async function AmmoLedgerLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname");
  if (shouldGuardAmmoLedgerLayout({ pathname })) {
    await requireAmmoUser();
  }

  return (
    <SerwistProvider swUrl="/serwist/sw.js">
      <AmmoLedgerSwrProvider>
        <AmmoLedgerOptimisticNavProvider>
          <AmmoLedgerWorkspacePrefetch />
          <AmmoLedgerShell>{children}</AmmoLedgerShell>
        </AmmoLedgerOptimisticNavProvider>
      </AmmoLedgerSwrProvider>
    </SerwistProvider>
  );
}
