import { resolveNavSection } from "@/features/ammo-ledger/navigation/resolve-nav-section/resolve-nav-section";
import { settingsHubGroups } from "@/features/ammo-ledger/settings/settings-hub-groups/settings-hub-groups";

export type AmmoLedgerParentPage = {
  href: string;
  label: string;
};

const settingsPages = settingsHubGroups.flatMap<AmmoLedgerParentPage>((group) => group.items);

// 申請書の印刷と座標調整は入力した内容を引き継ぐため、タブではなく直前の画面へ戻す。
const parentPageByPath: Record<string, AmmoLedgerParentPage> = {
  "/lab/ammo-ledger/applications/acquisition-permit/print": {
    href: "/lab/ammo-ledger/applications/acquisition-permit/new",
    label: "申請書の入力",
  },
  "/lab/ammo-ledger/applications/acquisition-permit/calibration": {
    href: "/lab/ammo-ledger/applications/acquisition-permit/print",
    label: "印刷プレビュー",
  },
};

/** サブページから一つ上の画面を返す。タブ直下の画面とオフライン案内では null。 */
export function resolveParentPage({ path }: { path: string }): AmmoLedgerParentPage | null {
  const fixedParent = parentPageByPath[path];
  if (fixedParent) {
    return fixedParent;
  }

  const section = resolveNavSection({ path });
  if (!section || path === section.href) {
    return null;
  }

  if (section.id === "settings") {
    // 設定の編集・確認・全国データは、設定の各一覧の下にある。
    const settingsListPath = path.split("/").slice(0, 5).join("/");
    const settingsList = settingsPages.find((page) => page.href === settingsListPath);
    if (settingsList && settingsListPath !== path) {
      return { href: settingsList.href, label: settingsList.label };
    }
  }

  return { href: section.href, label: section.label };
}
