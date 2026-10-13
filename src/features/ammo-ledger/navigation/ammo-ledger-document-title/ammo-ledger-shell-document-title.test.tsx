import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerShellDocumentTitle } from "./ammo-ledger-shell-document-title";

const navigation = vi.hoisted(() => ({ pathname: "/lab/ammo-ledger" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

function renderAt({ pathname }: { pathname: string }) {
  navigation.pathname = pathname;
  return (
    <AmmoLedgerOptimisticNavProvider>
      <AmmoLedgerShellDocumentTitle />
    </AmmoLedgerOptimisticNavProvider>
  );
}

describe("AmmoLedgerShellDocumentTitle", () => {
  beforeEach(() => {
    document.title = "消費の記録 | 実包管理帳簿";
  });

  it("pushState で切り替える画面の title を、表示中の画面に合わせる", () => {
    const { rerender } = render(renderAt({ pathname: "/lab/ammo-ledger/ledger" }));
    expect(document.title).toBe("帳簿 | 実包管理帳簿");

    rerender(renderAt({ pathname: "/lab/ammo-ledger/inventory" }));
    expect(document.title).toBe("残弾確認 | 実包管理帳簿");

    rerender(renderAt({ pathname: "/lab/ammo-ledger" }));
    expect(document.title).toBe("実包管理帳簿");
  });

  it("切り替える画面から離れたら、ページの metadata の title に戻す", () => {
    const { rerender } = render(renderAt({ pathname: "/lab/ammo-ledger/settings" }));
    expect(document.title).toBe("設定 | 実包管理帳簿");

    rerender(renderAt({ pathname: "/lab/ammo-ledger/consume/new" }));
    expect(document.title).toBe("消費の記録 | 実包管理帳簿");
  });

  it("Next.js が遷移先の title を書き込んでいれば上書きしない", () => {
    const { rerender } = render(renderAt({ pathname: "/lab/ammo-ledger/ledger" }));
    document.title = "銃 | 実包管理帳簿";

    rerender(renderAt({ pathname: "/lab/ammo-ledger/settings/guns" }));
    expect(document.title).toBe("銃 | 実包管理帳簿");
  });
});
