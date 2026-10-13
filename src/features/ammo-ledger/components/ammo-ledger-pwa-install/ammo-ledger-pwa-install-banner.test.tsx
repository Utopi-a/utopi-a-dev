import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerPwaInstallBanner } from "./ammo-ledger-pwa-install-banner";

const storageKey = "ammo-ledger-pwa-install-banner-dismissed";
const day = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-10-13T03:00:00Z");

async function renderBanner() {
  render(<AmmoLedgerPwaInstallBanner />);
  // 端末判定と保存値の読み込みは表示後の effect で行う。
  await act(async () => {});
}

describe("AmmoLedgerPwaInstallBanner の「後で」", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    );
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("「後で」を押すと隠し、押した時刻を保存する", async () => {
    await renderBanner();

    fireEvent.click(screen.getByRole("button", { name: "後で" }));

    expect(screen.queryByRole("region", { name: "アプリのインストール" })).toBeNull();
    expect(window.localStorage.getItem(storageKey)).toBe(String(now));
  });

  it("「後で」から30日たつと再び出す", async () => {
    window.localStorage.setItem(storageKey, String(now - 30 * day));
    await renderBanner();

    expect(screen.getByRole("region", { name: "アプリのインストール" })).toBeVisible();
  });

  it("「後で」から30日以内は出さない", async () => {
    window.localStorage.setItem(storageKey, String(now - 29 * day));
    await renderBanner();

    expect(screen.queryByRole("region", { name: "アプリのインストール" })).toBeNull();
  });

  it("以前の版で「後で」を押した利用者には出さず、今の時刻から30日を数え始める", async () => {
    window.localStorage.setItem(storageKey, "true");
    await renderBanner();

    expect(screen.queryByRole("region", { name: "アプリのインストール" })).toBeNull();
    expect(window.localStorage.getItem(storageKey)).toBe(String(now));
  });
});
