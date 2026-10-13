import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerRouteError } from "./ammo-ledger-route-error";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/lab/ammo-ledger/settings/guns",
  useRouter: () => ({ refresh }),
}));

describe("AmmoLedgerRouteError", () => {
  it("再試行でサーバーから取り直してから描き直す", () => {
    const reset = vi.fn();
    render(
      <AmmoLedgerOptimisticNavProvider>
        <AmmoLedgerRouteError reset={reset} />
      </AmmoLedgerOptimisticNavProvider>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("画面を表示できませんでした");
    expect(screen.getByRole("link", { name: "ホームへ" })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger",
    );

    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
