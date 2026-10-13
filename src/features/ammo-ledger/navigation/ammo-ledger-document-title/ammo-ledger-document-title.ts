import { ammoLedgerPwaConfig } from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";
import type { AmmoLedgerShellRoute } from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";

export const ammoLedgerTitleTemplate = `%s | ${ammoLedgerPwaConfig.name}`;

/** ホームは帳簿の名前だけを title にする。 */
export const ammoLedgerShellPageTitles: Record<AmmoLedgerShellRoute, string | undefined> = {
  home: undefined,
  ledger: "帳簿",
  inventory: "残弾確認",
  "settings-hub": "設定",
};

export function formatAmmoLedgerDocumentTitle({ title }: { title?: string }): string {
  return title ? ammoLedgerTitleTemplate.replace("%s", title) : ammoLedgerPwaConfig.name;
}
