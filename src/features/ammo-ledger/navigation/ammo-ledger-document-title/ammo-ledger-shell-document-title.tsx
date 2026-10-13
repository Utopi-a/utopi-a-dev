"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAmmoLedgerOptimisticNav } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import {
  ammoLedgerShellPageTitles,
  formatAmmoLedgerDocumentTitle,
} from "@/features/ammo-ledger/navigation/ammo-ledger-document-title/ammo-ledger-document-title";
import { resolveShellRoute } from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";

/**
 * ホーム・帳簿・残弾・設定は history.pushState で画面を切り替えるため、Next.js の metadata が
 * 適用されない。document.title を画面に合わせ、ルートの読み上げが遷移先を伝えられるようにする。
 */
export function AmmoLedgerShellDocumentTitle() {
  const pathname = usePathname();
  const { activePath } = useAmmoLedgerOptimisticNav();
  const route = resolveShellRoute({ path: activePath ?? pathname });
  const title = route
    ? formatAmmoLedgerDocumentTitle({ title: ammoLedgerShellPageTitles[route] })
    : null;

  useEffect(() => {
    if (!title) {
      return;
    }
    const previousTitle = document.title;
    document.title = title;
    return () => {
      // Next.js が遷移先の title をすでに書き込んでいれば、それを残す。
      if (document.title === title) {
        document.title = previousTitle;
      }
    };
  }, [title]);

  return null;
}
