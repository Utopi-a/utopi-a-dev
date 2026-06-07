import { describe, expect, it } from "vitest";
import {
  computeCurrentPermitBalance,
  computeRunningPermitBalance,
} from "./compute-running-permit-balance";

describe("computeRunningPermitBalance", () => {
  it("許可取得後の譲受で残数が減る", () => {
    const permitEvents = [{ occurredOn: "2026-01-01", eventKind: "grant" as const, quantity: 100 }];
    const ledgerEntries = [
      { id: "e1", occurredOn: "2026-01-05", category: "acquire" as const, quantity: 30 },
      { id: "e2", occurredOn: "2026-01-10", category: "acquire" as const, quantity: 20 },
    ];

    const balances = computeRunningPermitBalance({ permitEvents, ledgerEntries });

    expect(balances.get("e1")).toBe(70);
    expect(balances.get("e2")).toBe(50);
    expect(computeCurrentPermitBalance({ permitEvents, ledgerEntries })).toBe(50);
  });

  it("許可失効で残数がリセットされる", () => {
    const permitEvents = [
      { occurredOn: "2026-01-01", eventKind: "grant" as const, quantity: 100 },
      { occurredOn: "2026-06-01", eventKind: "expiry" as const, quantity: 40 },
      { occurredOn: "2026-06-15", eventKind: "carryover" as const, quantity: 80 },
    ];
    const ledgerEntries = [
      { id: "e1", occurredOn: "2026-05-01", category: "acquire" as const, quantity: 60 },
      { id: "e2", occurredOn: "2026-07-01", category: "acquire" as const, quantity: 10 },
    ];

    const balances = computeRunningPermitBalance({ permitEvents, ledgerEntries });

    expect(balances.get("e1")).toBe(40);
    expect(balances.get("e2")).toBe(70);
  });

  it("消費は許可残数に影響しない", () => {
    const permitEvents = [{ occurredOn: "2026-01-01", eventKind: "grant" as const, quantity: 50 }];
    const ledgerEntries = [
      { id: "e1", occurredOn: "2026-01-02", category: "acquire" as const, quantity: 25 },
      { id: "e2", occurredOn: "2026-01-03", category: "consume" as const, quantity: 10 },
    ];

    const balances = computeRunningPermitBalance({ permitEvents, ledgerEntries });

    expect(balances.get("e1")).toBe(25);
    expect(balances.get("e2")).toBe(25);
  });
});
