import { AmmoLedgerScrollRoot } from "@/features/ammo-ledger/components/ammo-ledger-scroll-root/ammo-ledger-scroll-root";

export default function AmmoLedgerLayout({ children }: { children: React.ReactNode }) {
  return <AmmoLedgerScrollRoot>{children}</AmmoLedgerScrollRoot>;
}
