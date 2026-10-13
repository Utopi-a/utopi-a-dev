"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useAmmoLedgerClientNav } from "@/features/ammo-ledger/navigation/use-ammo-ledger-client-nav/use-ammo-ledger-client-nav";

type AmmoLedgerShellLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & {
  href: string;
};

/** ホーム・帳簿・残弾・設定へは上部ナビと同じく端末内で切り替え、サーバーの応答を待たせない。 */
export function AmmoLedgerShellLink({ href, ...props }: AmmoLedgerShellLinkProps) {
  const { navigate } = useAmmoLedgerClientNav();

  return (
    <Link
      {...props}
      href={href}
      onNavigate={(event) => {
        if (navigate({ href })) event.preventDefault();
      }}
    />
  );
}
