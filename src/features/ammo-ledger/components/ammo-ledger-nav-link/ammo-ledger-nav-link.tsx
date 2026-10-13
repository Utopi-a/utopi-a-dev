"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useAmmoLedgerClientNav } from "@/features/ammo-ledger/navigation/use-ammo-ledger-client-nav/use-ammo-ledger-client-nav";
import { isClientShellNavPath } from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";

type AmmoLedgerNavLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

// 修飾キー付きや中ボタンのクリックは、新しいタブ・ウィンドウで開けるようブラウザに任せる。
function isPlainLeftClick({ event }: { event: MouseEvent }): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function AmmoLedgerNavLink({ href, className, children }: AmmoLedgerNavLinkProps) {
  const router = useRouter();
  const { navigate: navigateClientShell } = useAmmoLedgerClientNav();
  const isShellPath = isClientShellNavPath({ path: href });

  return (
    <Link
      href={href}
      // 帳簿・残弾などはクライアントで描画するため、サーバーへ先読みしない。
      prefetch={isShellPath ? false : undefined}
      onClick={(event) => {
        if (!isPlainLeftClick({ event })) return;
        event.preventDefault();
        if (!navigateClientShell({ href })) router.push(href);
      }}
      className={className}
    >
      {children}
    </Link>
  );
}
