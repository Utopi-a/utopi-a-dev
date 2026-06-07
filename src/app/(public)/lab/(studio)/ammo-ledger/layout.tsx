import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import { AmmoLedgerWorkspacePrefetch } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-prefetch/ammo-ledger-workspace-prefetch";

export default function AmmoLedgerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AmmoLedgerSwrProvider>
      <AmmoLedgerWorkspacePrefetch />
      <div className="space-y-5">
        <AmmoLedgerNav />
        {children}
      </div>
    </AmmoLedgerSwrProvider>
  );
}
