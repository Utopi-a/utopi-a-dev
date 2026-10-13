import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";

export type SetupChecklistRequirement = "required" | "recommended" | "optional";

export type SetupChecklistItem = {
  id: "profile" | "guns" | "ammo-types" | "permits" | "opening-balance";
  label: string;
  description: string;
  href: string;
  requirement: SetupChecklistRequirement;
  isDone: boolean;
};

export type SetupChecklist = {
  items: SetupChecklistItem[];
  /** 未完了の必須項目のうち最初のもの。null なら必須はすべて済んでいる */
  nextRequiredItemId: SetupChecklistItem["id"] | null;
};

export function buildSetupChecklist({
  workspace,
}: {
  workspace: Pick<
    AmmoLedgerWorkspace,
    "profile" | "guns" | "inventoryItems" | "permits" | "entries" | "permitEvents"
  >;
}): SetupChecklist {
  const { profile, guns, inventoryItems, permits, entries, permitEvents } = workspace;
  const items: SetupChecklistItem[] = [
    {
      id: "profile",
      label: "帳簿プロフィール",
      description: "氏名と住所。帳簿の印刷に使います",
      href: "/lab/ammo-ledger/settings/profile",
      requirement: "required",
      isDone: Boolean(profile?.ownerName.trim() && profile.ownerAddress?.trim()),
    },
    {
      id: "guns",
      label: "銃",
      description: "消費の記録に必要です",
      href: "/lab/ammo-ledger/settings/guns",
      requirement: "required",
      isDone: guns.length > 0,
    },
    {
      id: "ammo-types",
      label: "弾種",
      description: "消費・譲り受けの記録に必要です",
      href: "/lab/ammo-ledger/settings/ammo-types",
      requirement: "required",
      isDone: inventoryItems.length > 0,
    },
    {
      id: "permits",
      label: "譲受許可",
      description: "譲り受け（購入）を記録するときに必要です",
      href: "/lab/ammo-ledger/settings/permits",
      requirement: "recommended",
      isDone: permits.length > 0,
    },
    {
      id: "opening-balance",
      label: "年初繰越",
      description: "紙の帳簿から移行するときの残弾数・許可残数",
      href: "/lab/ammo-ledger/settings/opening-balance",
      requirement: "optional",
      isDone:
        entries.some((entry) => entry.category === "carryover") ||
        permitEvents.some((event) => event.eventKind === "carryover"),
    },
  ];

  const nextRequiredItem = items.find((item) => item.requirement === "required" && !item.isDone);

  return { items, nextRequiredItemId: nextRequiredItem?.id ?? null };
}
