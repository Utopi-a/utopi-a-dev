import { describe, expect, it } from "vitest";
import { resolveLedgerEntryReorderState } from "./resolve-ledger-entry-reorder-state";

describe("resolveLedgerEntryReorderState", () => {
  it("同日に複数記録がある場合だけ並び替え可能にする", () => {
    const rows = [
      {
        kind: "entry" as const,
        entry: {
          id: "e1",
          occurredOn: "2026-06-07",
          dayOrder: 0,
          createdAt: new Date("2026-06-07T09:00:00.000Z"),
        },
      },
      {
        kind: "entry" as const,
        entry: {
          id: "e2",
          occurredOn: "2026-06-07",
          dayOrder: 1,
          createdAt: new Date("2026-06-07T10:00:00.000Z"),
        },
      },
    ];

    expect(resolveLedgerEntryReorderState({ rows: rows as never, ledgerEntryId: "e1" })).toEqual({
      canMoveUp: false,
      canMoveDown: true,
    });
    expect(resolveLedgerEntryReorderState({ rows: rows as never, ledgerEntryId: "e2" })).toEqual({
      canMoveUp: true,
      canMoveDown: false,
    });
  });
});
