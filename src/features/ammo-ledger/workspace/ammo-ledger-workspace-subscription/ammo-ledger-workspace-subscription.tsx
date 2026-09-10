"use client";

import { usePathname } from "next/navigation";
import { ammoLedgerPwaConfig } from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

function WorkspaceSubscription() {
  // 設定画面での保存も再取得できるよう購読を維持する。訪問時の取得は各ビューに任せる。
  useAmmoLedgerWorkspace({ revalidateOnMount: false });
  return null;
}

export function AmmoLedgerWorkspaceSubscription() {
  const pathname = usePathname();
  return pathname === ammoLedgerPwaConfig.offlinePath ? null : <WorkspaceSubscription />;
}
