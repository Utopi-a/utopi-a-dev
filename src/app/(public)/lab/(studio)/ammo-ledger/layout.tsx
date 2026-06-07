import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerShell } from "@/features/ammo-ledger/components/ammo-ledger-shell/ammo-ledger-shell";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import { AmmoLedgerWorkspacePrefetch } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-prefetch/ammo-ledger-workspace-prefetch";

export default function AmmoLedgerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AmmoLedgerSwrProvider>
      <AmmoLedgerOptimisticNavProvider>
        <AmmoLedgerWorkspacePrefetch />
        <AmmoLedgerShell>{children}</AmmoLedgerShell>
      </AmmoLedgerOptimisticNavProvider>
    </AmmoLedgerSwrProvider>
  );
}
