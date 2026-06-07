import { describe, expect, it } from "vitest";
import { compareLedgerEntries } from "./compare-ledger-entries";

describe("compareLedgerEntries", () => {
  it("同日の記録は dayOrder で並べる", () => {
    const entries = [
      { occurredOn: "2026-06-07", dayOrder: 2, createdAt: "2026-06-07T10:00:00.000Z" },
      { occurredOn: "2026-06-07", dayOrder: 0, createdAt: "2026-06-07T09:00:00.000Z" },
      { occurredOn: "2026-06-07", dayOrder: 1, createdAt: "2026-06-07T11:00:00.000Z" },
    ];

    expect([...entries].sort((a, b) => compareLedgerEntries({ a, b }))).toEqual([
      entries[1],
      entries[2],
      entries[0],
    ]);
  });
});
