import { render, screen, waitFor, within } from "@testing-library/react";
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
    expect(screen.getAllByText("5,000個")).toHaveLength(2);
  });

  it("数量に受払の符号をつけ、種類別残・総残数・摘要を出し、許可残数は譲受の行だけに出す", () => {
    const consumeRow: LedgerDisplayRow = {
      kind: "entry",
      entry: {
        ...entryRow.entry,
        id: "entry-2",
        category: "consume",
        occurredOn: "2026-08-09",
        quantity: 25,
        location: "テスト射撃場",
        ledgerNote: "クレー射撃",
        counterpartyName: null,
        counterpartyAddress: null,
      },
    };

    render(
      <LedgerTable
        rows={[entryRow, consumeRow]}
        purpose="hunting"
        permitBalances={
          new Map([
            ["entry-1", 1150],
            ["entry-2", 1150],
          ])
        }
        rowBalances={
          new Map([
            ["entry-1", { balanceByType: 1050, totalBalance: 1200 }],
            ["entry-2", { balanceByType: 1025, totalBalance: 1175 }],
          ])
        }
      />,
    );

    const table = screen.getByRole("table");
    const [, acquireRow, consumeTableRow] = within(table).getAllByRole("row");
    expect(within(acquireRow).getByText("+50個")).toBeInTheDocument();
    expect(within(acquireRow).getByText("1,050個")).toBeInTheDocument();
    expect(within(acquireRow).getByText("1,150個")).toBeInTheDocument();
    expect(within(consumeTableRow).getByText("−25個")).toBeInTheDocument();
    expect(within(consumeTableRow).getByText("1,025個")).toBeInTheDocument();
    expect(within(consumeTableRow).getByText("1,175個")).toBeInTheDocument();
    expect(within(consumeTableRow).getByText("テスト射撃場 クレー射撃")).toBeInTheDocument();
    expect(within(consumeTableRow).queryByText("1,150個")).not.toBeInTheDocument();
  });

  it("表に見出しと列の範囲を持たせ、カードの操作ボタンは日付・区分・数だけの名前にする", () => {
    render(<LedgerTable rows={[entryRow]} purpose="hunting" />);

    const table = screen.getByRole("table", { name: "狩猟用の帳簿" });
    expect(within(table).getByRole("columnheader", { name: "種類別残" })).toHaveAttribute(
      "scope",
      "col",
    );
    expect(screen.getByRole("button", { name: "2026/08/08 譲受 50個 の操作" })).toBeInTheDocument();
  });

  it("自宅保管の目安を超えた行は、色だけでなく文字でも示す", () => {
    render(
      <LedgerTable rows={[entryRow]} purpose="hunting" homeStorageExceededEntryIds={["entry-1"]} />,
    );

    const [, row] = within(screen.getByRole("table")).getAllByRole("row");
    expect(within(row).getByText("目安超え")).toBeInTheDocument();
    expect(
      screen.getByText("この時点で全用途の残数が自宅保管の目安（800個）を超えています"),
    ).toBeInTheDocument();
  });
});
