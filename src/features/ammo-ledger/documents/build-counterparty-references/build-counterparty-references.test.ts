import { describe, expect, it } from "vitest";
import { buildCounterpartyReferences } from "./build-counterparty-references";

function makeEntry(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "e1",
    userId: "u1",
    transactionId: "t1",
    category: "acquire",
    purpose: "shooting",
    occurredOn: "2026-03-01",
    ammoTypeId: "a1",
    ammoTypeName: "クレー 7.5号",
    ammoCartridgeType: null,
    ammoCaliber: null,
    ammoGaugeNumber: null,
    quantity: 100,
    location: null,
    ledgerNote: null,
    counterpartyName: null,
    counterpartyAddress: null,
    gunId: null,
    gunName: null,
    gunNumber: null,
    gunPermitNumber: null,
    voidedAt: null,
    dayOrder: 0,
    createdAt: new Date("2026-03-01T00:00:00Z"),
    updatedAt: new Date("2026-03-01T00:00:00Z"),
    ...overrides,
  } as Parameters<typeof buildCounterpartyReferences>[0]["entries"][number];
}

describe("buildCounterpartyReferences", () => {
  it("相手方取引から一意な名称と住所の組を作る", () => {
    const entries = [
      makeEntry({
        id: "e1",
        category: "acquire",
        counterpartyName: "○○銃砲店",
        counterpartyAddress: "東京都新宿区1-1",
      }),
      makeEntry({
        id: "e2",
        category: "transfer",
        counterpartyName: "△△商店",
        counterpartyAddress: "大阪市中央区2-2",
      }),
      makeEntry({
        id: "e3",
        category: "acquire",
        counterpartyName: "○○銃砲店",
        counterpartyAddress: "東京都新宿区1-1",
      }),
    ];

    const references = buildCounterpartyReferences({ entries });

    expect(references).toEqual([
      { name: "○○銃砲店", address: "東京都新宿区1-1" },
      { name: "△△商店", address: "大阪市中央区2-2" },
    ]);
  });

  it("消費など相手方取引でないカテゴリは無視する", () => {
    const entries = [
      makeEntry({
        id: "e1",
        category: "consume",
        counterpartyName: "射撃場",
        counterpartyAddress: null,
      }),
    ];

    const references = buildCounterpartyReferences({ entries });
    expect(references).toHaveLength(0);
  });

  it("相手方名がnullのentryは無視する", () => {
    const entries = [
      makeEntry({
        id: "e1",
        category: "acquire",
        counterpartyName: null,
      }),
    ];

    const references = buildCounterpartyReferences({ entries });
    expect(references).toHaveLength(0);
  });

  it("同じ名称でも住所が異なれば別の行にする", () => {
    const entries = [
      makeEntry({
        id: "e1",
        category: "acquire",
        counterpartyName: "○○銃砲店",
        counterpartyAddress: "東京都",
      }),
      makeEntry({
        id: "e2",
        category: "acquire",
        counterpartyName: "○○銃砲店",
        counterpartyAddress: "大阪府",
      }),
    ];

    const references = buildCounterpartyReferences({ entries });
    expect(references).toEqual([
      { name: "○○銃砲店", address: "東京都" },
      { name: "○○銃砲店", address: "大阪府" },
    ]);
  });

  it("住所がnullでも別紙に載る", () => {
    const entries = [
      makeEntry({
        id: "e1",
        category: "acquire",
        counterpartyName: "○○銃砲店",
        counterpartyAddress: null,
      }),
    ];

    const references = buildCounterpartyReferences({ entries });
    expect(references).toHaveLength(1);
    expect(references[0].address).toBeNull();
  });
});
