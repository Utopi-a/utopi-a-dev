import { render, waitFor } from "@testing-library/react";
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
});
