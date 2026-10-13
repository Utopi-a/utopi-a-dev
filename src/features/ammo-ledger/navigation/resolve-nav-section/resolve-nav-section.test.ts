import { describe, expect, it } from "vitest";
import { resolveNavSection } from "./resolve-nav-section";

function sectionLabel({ path }: { path: string }) {
  return resolveNavSection({ path })?.label ?? null;
}

describe("resolveNavSection", () => {
  it("各タブの画面ではそのタブを返す", () => {
    expect(sectionLabel({ path: "/lab/ammo-ledger" })).toBe("ホーム");
    expect(sectionLabel({ path: "/lab/ammo-ledger/ledger" })).toBe("帳簿");
    expect(sectionLabel({ path: "/lab/ammo-ledger/inventory" })).toBe("残弾");
    expect(sectionLabel({ path: "/lab/ammo-ledger/settings" })).toBe("設定");
  });

  it("記録の入力と申請書はホームの下層として扱う", () => {
    for (const path of [
      "/lab/ammo-ledger/consume/new",
      "/lab/ammo-ledger/inflow/new",
      "/lab/ammo-ledger/bulk/new",
      "/lab/ammo-ledger/applications/acquisition-permit/new",
      "/lab/ammo-ledger/applications/acquisition-permit/print",
    ]) {
      expect(sectionLabel({ path })).toBe("ホーム");
    }
  });

  it("記録の編集と帳簿の印刷は帳簿の下層として扱う", () => {
    expect(sectionLabel({ path: "/lab/ammo-ledger/entries/entry-1/edit" })).toBe("帳簿");
    expect(sectionLabel({ path: "/lab/ammo-ledger/ledger/print" })).toBe("帳簿");
  });

  it("設定の一覧・編集・全国データは設定の下層として扱う", () => {
    for (const path of [
      "/lab/ammo-ledger/settings/guns",
      "/lab/ammo-ledger/settings/guns/gun-1/edit",
      "/lab/ammo-ledger/settings/ranges/catalog",
      "/lab/ammo-ledger/settings/ledger-lock",
    ]) {
      expect(sectionLabel({ path })).toBe("設定");
    }
  });

  it("オフライン案内と帳簿の外ではどのタブも選ばない", () => {
    expect(sectionLabel({ path: "/lab/ammo-ledger/~offline" })).toBeNull();
    expect(sectionLabel({ path: "/lab/settings" })).toBeNull();
    expect(sectionLabel({ path: "/lab/ammo-ledger-other" })).toBeNull();
  });
});
