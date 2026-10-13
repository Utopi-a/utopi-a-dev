import { describe, expect, it } from "vitest";
import type { PermitEventKind } from "@/features/ammo-ledger/schema/permit-event-kind";
import {
  computeCurrentPermitState,
  computeRunningPermitBalance,
} from "./compute-running-permit-balance";

function permitEvent({
  id,
  permitId,
  occurredOn,
  eventKind,
  quantity = 0,
}: {
  id: string;
  permitId: string | null;
  occurredOn: string;
  eventKind: PermitEventKind;
  quantity?: number;
}) {
  return { id, permitId, occurredOn, eventKind, quantity };
}

function acquire({
  id,
  occurredOn,
  quantity,
}: {
  id: string;
  occurredOn: string;
  quantity: number;
}) {
  return { id, occurredOn, category: "acquire" as const, quantity };
}

describe("computeRunningPermitBalance", () => {
  const today = "2026-06-07";

  it("許可取得後の譲受で残数が減る", () => {
    const permitEvents = [
      permitEvent({
        id: "g1",
        permitId: "p1",
        occurredOn: "2026-01-01",
        eventKind: "grant",
        quantity: 100,
      }),
    ];
    const ledgerEntries = [
      acquire({ id: "e1", occurredOn: "2026-01-05", quantity: 30 }),
      acquire({ id: "e2", occurredOn: "2026-01-10", quantity: 20 }),
    ];

    const balances = computeRunningPermitBalance({ permitEvents, ledgerEntries, today });

    expect(balances.get("e1")).toBe(70);
    expect(balances.get("e2")).toBe(50);
  });

  it("消費は許可残数に影響しない", () => {
    const permitEvents = [
      permitEvent({
        id: "g1",
        permitId: "p1",
        occurredOn: "2026-01-01",
        eventKind: "grant",
        quantity: 50,
      }),
    ];
    const ledgerEntries = [
      acquire({ id: "e1", occurredOn: "2026-01-02", quantity: 25 }),
      { id: "e2", occurredOn: "2026-01-03", category: "consume" as const, quantity: 10 },
    ];

    const balances = computeRunningPermitBalance({ permitEvents, ledgerEntries, today });

    expect(balances.get("e1")).toBe(25);
    expect(balances.get("e2")).toBe(25);
  });

  it("許可数量を超える譲受では、残数は0で止まる", () => {
    const permitEvents = [
      permitEvent({
        id: "g1",
        permitId: "p1",
        occurredOn: "2026-01-01",
        eventKind: "grant",
        quantity: 100,
      }),
    ];
    const ledgerEntries = [acquire({ id: "e1", occurredOn: "2026-02-01", quantity: 150 })];

    expect(computeRunningPermitBalance({ permitEvents, ledgerEntries, today }).get("e1")).toBe(0);
  });

  it("失効は失効した許可の残りだけを消し、期間が重なる別の許可の残りは残す", () => {
    // 旧許可を使い切った後に新許可を受け、旧許可の満了日を迎えるケース
    const permitEvents = [
      permitEvent({
        id: "old-carryover",
        permitId: "old",
        occurredOn: "2026-01-01",
        eventKind: "carryover",
        quantity: 100,
      }),
      permitEvent({
        id: "old-expiry",
        permitId: "old",
        occurredOn: "2026-12-15",
        eventKind: "expiry",
      }),
      permitEvent({
        id: "new-grant",
        permitId: "new",
        occurredOn: "2026-09-29",
        eventKind: "grant",
        quantity: 500,
      }),
      permitEvent({
        id: "new-expiry",
        permitId: "new",
        occurredOn: "2027-09-28",
        eventKind: "expiry",
      }),
    ];
    const ledgerEntries = [
      acquire({ id: "e1", occurredOn: "2026-09-27", quantity: 100 }),
      { id: "e2", occurredOn: "2026-12-20", category: "consume" as const, quantity: 10 },
    ];

    const balances = computeRunningPermitBalance({
      permitEvents,
      ledgerEntries,
      today: "2026-12-31",
    });

    expect(balances.get("e1")).toBe(0);
    expect(balances.get("old-expiry")).toBe(500);
    expect(balances.get("e2")).toBe(500);
  });

  it("譲受は有効期限の早い許可から差し引き、失効ではその許可の残りだけが消える", () => {
    const permitEvents = [
      permitEvent({
        id: "later-grant",
        permitId: "later",
        occurredOn: "2026-01-01",
        eventKind: "grant",
        quantity: 500,
      }),
      permitEvent({
        id: "sooner-grant",
        permitId: "sooner",
        occurredOn: "2026-02-01",
        eventKind: "grant",
        quantity: 100,
      }),
      permitEvent({
        id: "sooner-expiry",
        permitId: "sooner",
        occurredOn: "2026-06-30",
        eventKind: "expiry",
      }),
    ];
    const ledgerEntries = [acquire({ id: "e1", occurredOn: "2026-03-01", quantity: 30 })];

    const balances = computeRunningPermitBalance({
      permitEvents,
      ledgerEntries,
      today: "2026-12-31",
    });

    expect(balances.get("e1")).toBe(570);
    expect(balances.get("sooner-expiry")).toBe(500);
  });

  it.each([
    { order: "付与→失効", reverse: false },
    { order: "失効→付与", reverse: true },
  ])("同じ日の旧許可の失効と新許可の付与は、取得順によらず同じ残数になる（$order）", ({
    reverse,
  }) => {
    const sameDayEvents = [
      permitEvent({
        id: "new-grant",
        permitId: "new",
        occurredOn: "2026-06-07",
        eventKind: "grant",
        quantity: 500,
      }),
      permitEvent({
        id: "old-expiry",
        permitId: "old",
        occurredOn: "2026-06-07",
        eventKind: "expiry",
      }),
    ];
    const permitEvents = [
      permitEvent({
        id: "old-grant",
        permitId: "old",
        occurredOn: "2026-01-01",
        eventKind: "grant",
        quantity: 100,
      }),
      ...(reverse ? [...sameDayEvents].reverse() : sameDayEvents),
    ];
    const ledgerEntries = [
      acquire({ id: "e1", occurredOn: "2026-03-01", quantity: 30 }),
      acquire({ id: "e2", occurredOn: "2026-06-08", quantity: 20 }),
    ];

    const balances = computeRunningPermitBalance({
      permitEvents,
      ledgerEntries,
      today: "2026-06-08",
    });

    expect(balances.get("e1")).toBe(70);
    expect(balances.get("old-expiry")).toBe(500);
    expect(balances.get("e2")).toBe(480);
  });

  it("有効期限の当日の譲受は、その許可から差し引いてから失効させる", () => {
    const permitEvents = [
      permitEvent({
        id: "g1",
        permitId: "p1",
        occurredOn: "2026-01-01",
        eventKind: "grant",
        quantity: 100,
      }),
      permitEvent({ id: "x1", permitId: "p1", occurredOn: "2026-06-07", eventKind: "expiry" }),
    ];
    const ledgerEntries = [acquire({ id: "e1", occurredOn: "2026-06-07", quantity: 30 })];

    const balances = computeRunningPermitBalance({ permitEvents, ledgerEntries, today });

    expect(balances.get("e1")).toBe(70);
    expect(balances.get("x1")).toBe(0);
  });

  it("付与日と有効期限が同じ許可は、その日の譲受に使える", () => {
    const permitEvents = [
      permitEvent({ id: "x1", permitId: "one-day", occurredOn: "2026-06-07", eventKind: "expiry" }),
      permitEvent({
        id: "g1",
        permitId: "one-day",
        occurredOn: "2026-06-07",
        eventKind: "grant",
        quantity: 50,
      }),
    ];
    const ledgerEntries = [acquire({ id: "e1", occurredOn: "2026-06-07", quantity: 20 })];

    const balances = computeRunningPermitBalance({ permitEvents, ledgerEntries, today });

    expect(balances.get("e1")).toBe(30);
    expect(balances.get("x1")).toBe(0);
  });

  it("許可IDのない旧形式の失効は、用途の残数をすべて0にする", () => {
    const permitEvents = [
      permitEvent({
        id: "g1",
        permitId: null,
        occurredOn: "2026-01-01",
        eventKind: "grant",
        quantity: 100,
      }),
      permitEvent({ id: "x1", permitId: null, occurredOn: "2026-06-01", eventKind: "expiry" }),
      permitEvent({
        id: "c1",
        permitId: null,
        occurredOn: "2026-06-15",
        eventKind: "carryover",
        quantity: 80,
      }),
    ];
    const ledgerEntries = [
      acquire({ id: "e1", occurredOn: "2026-05-01", quantity: 60 }),
      acquire({ id: "e2", occurredOn: "2026-07-01", quantity: 10 }),
    ];

    const balances = computeRunningPermitBalance({
      permitEvents,
      ledgerEntries,
      today: "2026-12-31",
    });

    expect(balances.get("e1")).toBe(40);
    expect(balances.get("x1")).toBe(0);
    expect(balances.get("e2")).toBe(70);
  });

  it("今日より後の許可イベントは表の残数に反映しない", () => {
    const permitEvents = [
      permitEvent({
        id: "g1",
        permitId: "p1",
        occurredOn: "2026-01-01",
        eventKind: "grant",
        quantity: 100,
      }),
      permitEvent({ id: "x1", permitId: "p1", occurredOn: "2026-12-31", eventKind: "expiry" }),
    ];
    const ledgerEntries = [acquire({ id: "e1", occurredOn: "2027-01-05", quantity: 30 })];

    const balances = computeRunningPermitBalance({ permitEvents, ledgerEntries, today });

    expect(balances.get("e1")).toBe(70);
    expect(balances.has("x1")).toBe(false);
  });
});

describe("computeCurrentPermitState", () => {
  const today = "2026-06-07";

  it("未来の許可失効は現在残数に反映しない", () => {
    const permitEvents = [
      permitEvent({
        id: "g1",
        permitId: "p1",
        occurredOn: "2026-01-01",
        eventKind: "grant",
        quantity: 100,
      }),
      permitEvent({ id: "x1", permitId: "p1", occurredOn: "2026-12-31", eventKind: "expiry" }),
    ];
    const ledgerEntries = [acquire({ id: "e1", occurredOn: "2026-03-01", quantity: 30 })];

    expect(computeCurrentPermitState({ permitEvents, ledgerEntries, today }).balance).toBe(70);
  });

  it("有効期限の当日は失効前の残数を返し、翌日に0になる", () => {
    const permitEvents = [
      permitEvent({
        id: "g1",
        permitId: "p1",
        occurredOn: "2026-01-01",
        eventKind: "grant",
        quantity: 100,
      }),
      permitEvent({ id: "x1", permitId: "p1", occurredOn: "2026-06-07", eventKind: "expiry" }),
    ];
    const ledgerEntries = [acquire({ id: "e1", occurredOn: "2026-03-01", quantity: 30 })];

    const onExpiryDay = computeCurrentPermitState({
      permitEvents,
      ledgerEntries,
      today: "2026-06-07",
    });
    const nextDay = computeCurrentPermitState({ permitEvents, ledgerEntries, today: "2026-06-08" });

    expect(onExpiryDay.balance).toBe(70);
    expect(onExpiryDay.remainingByPermitId.get("p1")).toBe(70);
    expect(nextDay.balance).toBe(0);
    expect(nextDay.remainingByPermitId.has("p1")).toBe(false);
  });

  it("今日より後の日付の譲受は現在残数から差し引かない", () => {
    const permitEvents = [
      permitEvent({
        id: "g1",
        permitId: "p1",
        occurredOn: "2026-01-01",
        eventKind: "grant",
        quantity: 100,
      }),
    ];
    const ledgerEntries = [
      acquire({ id: "e1", occurredOn: "2026-06-07", quantity: 30 }),
      acquire({ id: "e2", occurredOn: "2026-06-08", quantity: 70 }),
    ];

    expect(computeCurrentPermitState({ permitEvents, ledgerEntries, today }).balance).toBe(70);
  });

  it("許可ごとの残りは、表と同じく有効期限の早い許可から差し引いた値になる", () => {
    const permitEvents = [
      permitEvent({
        id: "later-grant",
        permitId: "later",
        occurredOn: "2026-01-01",
        eventKind: "grant",
        quantity: 500,
      }),
      permitEvent({
        id: "later-expiry",
        permitId: "later",
        occurredOn: "2027-05-31",
        eventKind: "expiry",
      }),
      permitEvent({
        id: "sooner-grant",
        permitId: "sooner",
        occurredOn: "2026-02-01",
        eventKind: "grant",
        quantity: 100,
      }),
      permitEvent({
        id: "sooner-expiry",
        permitId: "sooner",
        occurredOn: "2026-12-31",
        eventKind: "expiry",
      }),
    ];
    const ledgerEntries = [acquire({ id: "e1", occurredOn: "2026-03-01", quantity: 150 })];

    const state = computeCurrentPermitState({ permitEvents, ledgerEntries, today });

    expect(state.balance).toBe(450);
    expect(state.remainingByPermitId.get("sooner")).toBe(0);
    expect(state.remainingByPermitId.get("later")).toBe(450);
  });
});
