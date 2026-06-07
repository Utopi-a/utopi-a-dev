import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerShell } from "@/features/ammo-ledger/components/ammo-ledger-shell/ammo-ledger-shell";
import { ammoLedgerPwaConfig } from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import { AmmoLedgerWorkspacePrefetch } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-prefetch/ammo-ledger-workspace-prefetch";

export const metadata: Metadata = {
  applicationName: ammoLedgerPwaConfig.shortName,
  title: ammoLedgerPwaConfig.name,
  description: ammoLedgerPwaConfig.description,
  manifest: ammoLedgerPwaConfig.manifestPath,
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

export default function AmmoLedgerLayout({ children }: { children: React.ReactNode }) {
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
