"use client";

import { AmmoLedgerRouteError } from "@/features/ammo-ledger/components/ammo-ledger-route-error/ammo-ledger-route-error";

export default function AmmoLedgerErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <AmmoLedgerRouteError reset={reset} />;
}
