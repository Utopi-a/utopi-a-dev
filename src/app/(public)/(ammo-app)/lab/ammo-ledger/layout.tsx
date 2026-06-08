import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Toaster } from "@/components/ui/sonner";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { shouldGuardAmmoLedgerLayout } from "@/features/ammo-ledger/auth/should-guard-ammo-ledger-layout/should-guard-ammo-ledger-layout";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerShell } from "@/features/ammo-ledger/components/ammo-ledger-shell/ammo-ledger-shell";
import { AmmoLedgerSubpageChrome } from "@/features/ammo-ledger/components/ammo-ledger-subpage-chrome/ammo-ledger-subpage-chrome";
import {
  ammoLedgerPwaConfig,
  ammoLedgerPwaIcons,
} from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import { AmmoLedgerWorkspacePrefetch } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-prefetch/ammo-ledger-workspace-prefetch";
import { loadInitialAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/load-initial-ammo-ledger-workspace/load-initial-ammo-ledger-workspace";
import "@/features/ammo-ledger/ammo-ledger-styles.css";
import { labFontClassName } from "@/lib/theme/lab-fonts";

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
  const initialWorkspace = await loadInitialAmmoLedgerWorkspace({ pathname });

  if (shouldGuardAmmoLedgerLayout({ pathname }) && !initialWorkspace) {
    await requireAmmoUser();
  }

  return (
    <div
      className={`${labFontClassName} mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-6 sm:px-6 sm:pb-8`}
    >
      <SerwistProvider swUrl="/serwist/sw.js">
        <AmmoLedgerSwrProvider initialWorkspace={initialWorkspace}>
          <AmmoLedgerOptimisticNavProvider>
            <AmmoLedgerWorkspacePrefetch />
            <AmmoLedgerShell>
              <AmmoLedgerSubpageChrome>{children}</AmmoLedgerSubpageChrome>
            </AmmoLedgerShell>
          </AmmoLedgerOptimisticNavProvider>
        </AmmoLedgerSwrProvider>
      </SerwistProvider>
      <Toaster />
    </div>
  );
}
