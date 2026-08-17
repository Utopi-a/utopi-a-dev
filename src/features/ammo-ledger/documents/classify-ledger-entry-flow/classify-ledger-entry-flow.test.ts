import { describe, expect, it } from "vitest";
import { classifyLedgerEntryFlow, isCounterpartyCategory } from "./classify-ledger-entry-flow";

describe("classifyLedgerEntryFlow", () => {
  it.each([
    ["manufacture", 100, "receive"],
    ["acquire", 50, "receive"],
    ["receive", 25, "receive"],
    ["carryover", 200, "receive"],
    ["transfer", 30, "pay"],
    ["issue", 10, "pay"],
    ["consume", 50, "pay"],
    ["dispose", 5, "pay"],
  ] as const)("%s → %s", (category, quantity, expected) => {
    expect(classifyLedgerEntryFlow({ category, quantity })).toBe(expected);
  });

  it("未知カテゴリは数量の符号で判定する（正→受）", () => {
    expect(classifyLedgerEntryFlow({ category: "unknown", quantity: 10 })).toBe("receive");
  });

  it("未知カテゴリは数量の符号で判定する（負→払）", () => {
    expect(classifyLedgerEntryFlow({ category: "unknown", quantity: -5 })).toBe("pay");
  });

  it("未知カテゴリで数量0は受として扱う", () => {
    expect(classifyLedgerEntryFlow({ category: "unknown", quantity: 0 })).toBe("receive");
  });
});

describe("isCounterpartyCategory", () => {
  it.each(["acquire", "transfer", "receive", "issue"])("%s は相手方取引", (category) => {
    expect(isCounterpartyCategory({ category })).toBe(true);
  });

  it.each([
    "consume",
    "manufacture",
    "dispose",
    "carryover",
  ])("%s は相手方取引ではない", (category) => {
    expect(isCounterpartyCategory({ category })).toBe(false);
  });
});
