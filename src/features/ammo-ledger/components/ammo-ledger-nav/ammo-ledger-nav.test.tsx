import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerNav } from "./ammo-ledger-nav";

const navigation = vi.hoisted(() => ({ pathname: "/lab/ammo-ledger" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

function renderNav({ pathname }: { pathname: string }) {
  navigation.pathname = pathname;
  render(
    <AmmoLedgerOptimisticNavProvider>
      <AmmoLedgerNav />
    </AmmoLedgerOptimisticNavProvider>,
  );
  return within(screen.getByRole("navigation", { name: "帳簿メニュー" }));
}

describe("AmmoLedgerNav", () => {
  it("下層の画面でも親のタブだけを現在地として示す", () => {
    const nav = renderNav({ pathname: "/lab/ammo-ledger/settings/guns/gun-1/edit" });

    expect(nav.getByRole("button", { name: "設定" })).toHaveAttribute("aria-current", "page");
    for (const label of ["ホーム", "帳簿", "残弾"]) {
      expect(nav.getByRole("button", { name: label })).not.toHaveAttribute("aria-current");
    }
  });

  it("記録の入力中はホームを現在地として示す", () => {
    const nav = renderNav({ pathname: "/lab/ammo-ledger/consume/new" });

    expect(nav.getByRole("button", { name: "ホーム" })).toHaveAttribute("aria-current", "page");
  });
});
