"use client";

import { useIsOnline } from "@/features/ammo-ledger/pwa/use-is-online/use-is-online";

/** 帳簿は端末に残さないため、電波がないと保存も表示もできないことを先に知らせる。 */
export function AmmoLedgerOfflineNotice() {
  const isOnline = useIsOnline();
  if (isOnline) {
    return null;
  }

  return (
    <p
      role="status"
      className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm"
    >
      オフラインです。保存と帳簿の表示には電波が必要です。
    </p>
  );
}
