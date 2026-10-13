import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import { AmmoLedgerSubpageChrome } from "./ammo-ledger-subpage-chrome";

const navigation = vi.hoisted(() => ({ pathname: "/lab/ammo-ledger" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function renderChrome({ pathname }: { pathname: string }) {
  navigation.pathname = pathname;
  render(
    <AmmoLedgerSwrProvider>
      <AmmoLedgerOptimisticNavProvider>
        <AmmoLedgerSubpageChrome>
          <h1>ページ本文</h1>
        </AmmoLedgerSubpageChrome>
      </AmmoLedgerOptimisticNavProvider>
    </AmmoLedgerSwrProvider>,
  );
}

describe("AmmoLedgerSubpageChrome", () => {
  it("設定の編集画面ではその一覧へ戻るリンクを一つだけ出す", () => {
    renderChrome({ pathname: "/lab/ammo-ledger/settings/guns/gun-1/edit" });

    const backLinks = screen.getAllByRole("link", { name: /^←/ });
    expect(backLinks).toHaveLength(1);
    expect(backLinks[0]).toHaveAccessibleName("← 銃");
    expect(backLinks[0]).toHaveAttribute("href", "/lab/ammo-ledger/settings/guns");
  });

  it("記録の編集画面では帳簿へ戻るリンクを出す", () => {
    renderChrome({ pathname: "/lab/ammo-ledger/entries/entry-1/edit" });

    expect(screen.getByRole("link", { name: "← 帳簿" })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/ledger",
    );
  });

  it("オフライン案内には戻るリンクを出さない", () => {
    renderChrome({ pathname: "/lab/ammo-ledger/~offline" });

    expect(screen.queryByRole("link", { name: /^←/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ページ本文" })).toBeVisible();
  });
});
