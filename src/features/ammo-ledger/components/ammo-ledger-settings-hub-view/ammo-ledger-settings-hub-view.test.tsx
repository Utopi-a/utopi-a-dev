import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerSettingsHubView } from "./ammo-ledger-settings-hub-view";

const iphoneUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

describe("AmmoLedgerSettingsHubView", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(iphoneUserAgent);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("記録の前に必要な登録を先頭に、アプリの案内を末尾に並べる", async () => {
    render(<AmmoLedgerSettingsHubView />);

    // PWA の案内は端末判定の後に出る。
    await screen.findByRole("heading", { name: "アプリ" });
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "はじめに登録",
      "よく使う場所・相手",
      "書類・年末の手続き",
      "データの点検",
      "アプリ",
    ]);

    const firstSection = screen.getByRole("heading", { name: "はじめに登録" }).closest("section");
    expect(firstSection).not.toBeNull();
    expect(
      within(firstSection as HTMLElement)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual([
      "/lab/ammo-ledger/settings/profile",
      "/lab/ammo-ledger/settings/guns",
      "/lab/ammo-ledger/settings/ammo-types",
      "/lab/ammo-ledger/settings/permits",
      "/lab/ammo-ledger/settings/opening-balance",
    ]);
  });

  it("e2e が名前で探すリンクは、それぞれ1件だけに一致する", () => {
    render(<AmmoLedgerSettingsHubView />);

    expect(screen.getByRole("link", { name: /年初繰越/ })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/settings/opening-balance",
    );
    expect(screen.getByRole("link", { name: /譲受許可申請書/ })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/applications/acquisition-permit/new",
    );
    expect(screen.getByRole("link", { name: /帳簿の確定・ロック/ })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/settings/ledger-lock",
    );
  });
});
