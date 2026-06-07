import { describe, expect, it } from "vitest";
import { assignDayOrdersForNewEntries } from "./resolve-day-orders-for-new-entries";

describe("assignDayOrdersForNewEntries", () => {
  it("同日の新規記録に連番の dayOrder を割り当てる", () => {
    const dayOrders = assignDayOrdersForNewEntries({
      occurredOnDates: ["2026-06-07", "2026-06-07", "2026-06-08"],
      maxDayOrderByDate: new Map([["2026-06-07", 1]]),
    });

    expect(dayOrders).toEqual([2, 3, 0]);
  });
});
