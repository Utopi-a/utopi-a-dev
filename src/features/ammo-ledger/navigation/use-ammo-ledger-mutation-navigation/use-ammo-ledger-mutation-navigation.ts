"use client";

import { useRouter } from "next/navigation";
import { useAmmoLedgerClientNav } from "@/features/ammo-ledger/navigation/use-ammo-ledger-client-nav/use-ammo-ledger-client-nav";
import { useRequestAmmoLedgerWorkspaceRevalidation } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

export function useAmmoLedgerMutationNavigation() {
  const router = useRouter();
  const { navigate } = useAmmoLedgerClientNav();
  const requestRevalidation = useRequestAmmoLedgerWorkspaceRevalidation();
  return ({ href }: { href: string }) => {
    if (!navigate({ href })) router.push(href);
    requestRevalidation();
  };
}
