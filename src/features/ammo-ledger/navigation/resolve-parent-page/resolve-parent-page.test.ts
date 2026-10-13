import { describe, expect, it } from "vitest";
import { resolveParentPage } from "./resolve-parent-page";

describe("resolveParentPage", () => {
  it("タブ直下の画面とオフライン案内には戻り先を出さない", () => {
    for (const path of [
      "/lab/ammo-ledger",
      "/lab/ammo-ledger/ledger",
      "/lab/ammo-ledger/inventory",
      "/lab/ammo-ledger/settings",
      "/lab/ammo-ledger/~offline",
    ]) {
      expect(resolveParentPage({ path })).toBeNull();
    }
  });

  it("設定の各一覧からは設定へ戻す", () => {
    expect(resolveParentPage({ path: "/lab/ammo-ledger/settings/guns" })).toEqual({
      href: "/lab/ammo-ledger/settings",
      label: "設定",
    });
    expect(resolveParentPage({ path: "/lab/ammo-ledger/settings/permit-events" })).toEqual({
      href: "/lab/ammo-ledger/settings",
      label: "設定",
    });
  });

  it("設定の編集・確認・全国データからはその一覧へ戻す", () => {
    expect(resolveParentPage({ path: "/lab/ammo-ledger/settings/guns/gun-1/edit" })).toEqual({
      href: "/lab/ammo-ledger/settings/guns",
      label: "銃",
    });
    expect(resolveParentPage({ path: "/lab/ammo-ledger/settings/ammo-types/review" })).toEqual({
      href: "/lab/ammo-ledger/settings/ammo-types",
      label: "弾種",
    });
    expect(resolveParentPage({ path: "/lab/ammo-ledger/settings/ranges/catalog" })).toEqual({
      href: "/lab/ammo-ledger/settings/ranges",
      label: "射撃場（マイリスト）",
    });
  });

  it("記録の編集と帳簿の印刷からは帳簿へ戻す", () => {
    const ledger = { href: "/lab/ammo-ledger/ledger", label: "帳簿" };
    expect(resolveParentPage({ path: "/lab/ammo-ledger/entries/entry-1/edit" })).toEqual(ledger);
    expect(resolveParentPage({ path: "/lab/ammo-ledger/ledger/print" })).toEqual(ledger);
  });

  it("記録の入力と申請書の入力からはホームへ戻す", () => {
    const home = { href: "/lab/ammo-ledger", label: "ホーム" };
    for (const path of [
      "/lab/ammo-ledger/consume/new",
      "/lab/ammo-ledger/inflow/new",
      "/lab/ammo-ledger/bulk/new",
      "/lab/ammo-ledger/applications/acquisition-permit/new",
    ]) {
      expect(resolveParentPage({ path })).toEqual(home);
    }
  });

  it("申請書の印刷からは入力へ、座標調整からは印刷へ戻す", () => {
    expect(
      resolveParentPage({ path: "/lab/ammo-ledger/applications/acquisition-permit/print" }),
    ).toEqual({
      href: "/lab/ammo-ledger/applications/acquisition-permit/new",
      label: "申請書の入力",
    });
    expect(
      resolveParentPage({ path: "/lab/ammo-ledger/applications/acquisition-permit/calibration" }),
    ).toEqual({
      href: "/lab/ammo-ledger/applications/acquisition-permit/print",
      label: "印刷プレビュー",
    });
  });
});
