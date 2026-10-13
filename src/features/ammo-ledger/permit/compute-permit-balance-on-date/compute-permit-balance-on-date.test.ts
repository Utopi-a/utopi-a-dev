import { describe, expect, it } from "vitest";
import { buildTestEntry } from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { computePermitBalanceOnDate } from "./compute-permit-balance-on-date";

const permitEvents = [
  {
    id: "grant",
    permitId: "permit-1",
    purpose: "shooting",
    eventKind: "grant",
    occurredOn: "2026-04-01",
    quantity: 500,
  },
  {
    id: "expiry",
    permitId: "permit-1",
    purpose: "shooting",
    eventKind: "expiry",
    occurredOn: "2026-09-30",
    quantity: 0,
  },
  {
    id: "hunting-grant",
    permitId: "permit-2",
    purpose: "hunting",
    eventKind: "grant",
    occurredOn: "2026-04-01",
    quantity: 100,
  },
];

const entries = [
  buildTestEntry({ id: "acquire-1", category: "acquire", occurredOn: "2026-05-01", quantity: 200 }),
  buildTestEntry({ id: "acquire-2", category: "acquire", occurredOn: "2026-08-01", quantity: 100 }),
  buildTestEntry({ id: "consume-1", category: "consume", occurredOn: "2026-06-01", quantity: 50 }),
];

describe("computePermitBalanceOnDate", () => {
  it("譲受日までの譲受だけを差し引き、消費や他の用途の許可は数えない", () => {
    expect(
      computePermitBalanceOnDate({
        permitEvents,
        entries,
        purpose: "shooting",
        occurredOn: "2026-06-15",
      }),
    ).toBe(300);
  });

  it("有効期限の当日まで使え、翌日からは失効した許可の残りを数えない", () => {
    const balanceOn = (occurredOn: string) =>
      computePermitBalanceOnDate({ permitEvents, entries, purpose: "shooting", occurredOn });

    expect(balanceOn("2026-09-30")).toBe(200);
    expect(balanceOn("2026-10-01")).toBe(0);
  });

  it("編集中の譲受は差し引かない", () => {
    expect(
      computePermitBalanceOnDate({
        permitEvents,
        entries,
        purpose: "shooting",
        occurredOn: "2026-08-01",
        excludedEntryId: "acquire-2",
      }),
    ).toBe(300);
  });
});
