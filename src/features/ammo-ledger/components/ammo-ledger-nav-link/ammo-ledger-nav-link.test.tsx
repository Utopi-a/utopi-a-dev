import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerNavLink } from "./ammo-ledger-nav-link";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, prefetch: vi.fn() }),
  usePathname: () => "/lab/ammo-ledger",
}));

function renderLink({ href }: { href: string }) {
  render(
    <AmmoLedgerOptimisticNavProvider>
      <AmmoLedgerNavLink href={href}>開く</AmmoLedgerNavLink>
    </AmmoLedgerOptimisticNavProvider>,
  );
  return screen.getByRole("link", { name: "開く" });
}

describe("AmmoLedgerNavLink", () => {
  let defaultPreventedByLink: boolean[] = [];
  // リンクの処理後に既定動作が止められたかを記録し、jsdom の未実装の遷移は起こさない。
  const recordDefaultPrevented = (event: MouseEvent) => {
    defaultPreventedByLink.push(event.defaultPrevented);
    event.preventDefault();
  };

  beforeEach(() => {
    defaultPreventedByLink = [];
    pushMock.mockReset();
    window.addEventListener("click", recordDefaultPrevented);
  });

  afterEach(() => {
    window.removeEventListener("click", recordDefaultPrevented);
    cleanup();
    vi.restoreAllMocks();
  });

  it("通常のクリックではアプリ内で遷移する", () => {
    const link = renderLink({ href: "/lab/ammo-ledger/consume/new" });

    fireEvent.click(link);

    expect(defaultPreventedByLink).toEqual([true]);
    expect(pushMock).toHaveBeenCalledWith("/lab/ammo-ledger/consume/new");
  });

  it.each([
    ["Cmd", { metaKey: true }],
    ["Ctrl", { ctrlKey: true }],
    ["Shift", { shiftKey: true }],
    ["中ボタン", { button: 1 }],
  ])("%s 付きのクリックはブラウザに任せ、新しいタブ・ウィンドウで開けるようにする", (_, init) => {
    const link = renderLink({ href: "/lab/ammo-ledger/consume/new" });

    fireEvent.click(link, init);

    expect(defaultPreventedByLink).toEqual([false]);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("帳簿・残弾などクライアントで描画する画面へは履歴だけを書き換えて遷移する", () => {
    const pushState = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const link = renderLink({ href: "/lab/ammo-ledger/inventory" });

    fireEvent.click(link);

    expect(defaultPreventedByLink).toEqual([true]);
    expect(pushState).toHaveBeenCalledWith(null, "", "/lab/ammo-ledger/inventory");
    expect(pushMock).not.toHaveBeenCalled();
  });
});
