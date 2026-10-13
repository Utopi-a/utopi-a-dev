import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LedgerDisplayRow } from "@/features/ammo-ledger/ledger/build-ledger-display-rows/build-ledger-display-rows";
import { LedgerTable } from "./ledger-table";

vi.mock("@/features/ammo-ledger/components/ledger-table/ledger-entry-actions-sheet", () => ({
  LedgerEntryActionsSheet: () => null,
}));

const entryRow: LedgerDisplayRow = {
  kind: "entry",
  entry: {
    id: "entry-1",
    userId: "user-1",
    transactionId: "transaction-1",
    category: "acquire",
    purpose: "hunting",
    occurredOn: "2026-08-08",
    ammoTypeId: "ammo-1",
    ammoTypeName: "12番 散弾 7.5号",
    ammoCartridgeType: "shotgun_shot",
    ammoCaliber: "12番",
    ammoGaugeNumber: "7.5号",
    ledgerNote: null,
    quantity: 50,
    location: null,
    counterpartyName: "テスト銃砲店",
    counterpartyAddress: "茨城県",
    gunId: null,
    gunName: null,
    gunNumber: null,
    gunPermitNumber: null,
    voidedAt: null,
    dayOrder: 0,
    createdAt: new Date("2026-08-08T01:00:00Z"),
    updatedAt: new Date("2026-08-08T01:00:00Z"),
  },
};

describe("LedgerTable", () => {
  afterEach(() => {
    Reflect.deleteProperty(window.HTMLElement.prototype, "scrollIntoView");
    vi.unstubAllGlobals();
  });

  it("追加直後の帳簿行を強調して表示位置へスクロールする", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const scrollIntoView = vi.fn();
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    const { container } = render(
      <LedgerTable rows={[entryRow]} purpose="hunting" highlightedEntryId="entry-1" />,
    );

    await waitFor(() =>
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" }),
    );
    expect(container.querySelectorAll('[data-ledger-entry-id="entry-1"]')).toHaveLength(2);
  });

  it("動きを減らす設定では、追加直後の帳簿行へ瞬時にスクロールする", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
    }));
    const scrollIntoView = vi.fn();
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    render(<LedgerTable rows={[entryRow]} purpose="hunting" highlightedEntryId="entry-1" />);

    await waitFor(() =>
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "center" }),
    );
  });

  it("許可残数失効行には、失効を適用した後の許可残数を表示する", () => {
    const expiryRow: LedgerDisplayRow = {
      kind: "permit_expiry",
      id: "permit-expiry-pe-1",
      eventId: "pe-1",
      occurredOn: "2026-12-15",
      permitName: "旧許可",
      permitPurpose: "標的射撃",
    };

    render(
      <LedgerTable
        rows={[expiryRow]}
        purpose="shooting"
        permitBalances={new Map([["pe-1", 5000]])}
      />,
    );

    // PC の表とモバイルのカードの両方に出す
    expect(screen.getAllByText("5000個")).toHaveLength(2);
  });
});
