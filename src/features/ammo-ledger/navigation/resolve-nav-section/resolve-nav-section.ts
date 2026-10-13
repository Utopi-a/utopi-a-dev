import { ammoLedgerPwaConfig } from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";

const rootPath = ammoLedgerPwaConfig.startUrl;

export const ammoLedgerNavSections = [
  { id: "home", href: rootPath, label: "ホーム" },
  { id: "ledger", href: `${rootPath}/ledger`, label: "帳簿" },
  { id: "inventory", href: `${rootPath}/inventory`, label: "残弾" },
  { id: "settings", href: `${rootPath}/settings`, label: "設定" },
] as const;

export type AmmoLedgerNavSection = (typeof ammoLedgerNavSections)[number];

// 記録の入力や申請書づくりはホームから始めるため、ここにない下層はホームに属する。
const sectionIdByFirstSegment: Record<string, AmmoLedgerNavSection["id"]> = {
  ledger: "ledger",
  entries: "ledger",
  inventory: "inventory",
  settings: "settings",
};

/** 下層のページでも、どのタブの中にいるかを返す。帳簿の外とオフライン案内では null。 */
export function resolveNavSection({ path }: { path: string }): AmmoLedgerNavSection | null {
  if (path === ammoLedgerPwaConfig.offlinePath) {
    return null;
  }
  if (path !== rootPath && !path.startsWith(`${rootPath}/`)) {
    return null;
  }

  const firstSegment = path.slice(rootPath.length + 1).split("/")[0];
  const sectionId = sectionIdByFirstSegment[firstSegment] ?? "home";
  return ammoLedgerNavSections.find((section) => section.id === sectionId) ?? null;
}
