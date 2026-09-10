import { getTableName } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LedgerTransactionInput } from "@/features/ammo-ledger/schema/transaction-schema";
import { prepareConfirmedTransaction } from "@/features/ammo-ledger/transactions/prepare-confirmed-transaction/prepare-confirmed-transaction";

const database = vi.hoisted(() => ({ read: vi.fn(), insert: vi.fn() }));

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: (table: Parameters<typeof getTableName>[0]) => ({
        where: () => {
          const result = database.read(getTableName(table));
          return Object.assign(result, {
            orderBy: () => result,
            limit: () => result,
          });
        },
      }),
    }),
    insert: database.insert,
  },
}));

const ammoTypeRow = { id: "ammo-1", name: "12番・散弾", roundsPerBox: 25 };
const gunRow = {
  id: "gun-1",
  name: "上下二連",
  gunNumber: "12345",
  permitNumber: "67890",
};
const rangeRow = { id: "range-1", name: "射撃場", address: "東京都" };
const consumeInput: LedgerTransactionInput = {
  inputKind: "consume",
  purpose: "shooting",
  occurredOn: "2026-09-10",
  ammoTypeId: "ammo-1",
  gunId: "gun-1",
  rangeId: "range-1",
  outerBoxCount: 0,
  boxCount: 1,
  looseRounds: 0,
};

function deferredRows() {
  let resolve: (rows: unknown[]) => void = () => {};
  const promise = new Promise<unknown[]>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("prepareConfirmedTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.read.mockImplementation(() => Promise.resolve([]));
  });

  it("消費に必要なマスタを同時に読み、確定帳簿の数量と表示情報を返す", async () => {
    const ammo = deferredRows();
    const gun = deferredRows();
    const range = deferredRows();
    const pendingRows = new Map([
      ["ammo_type", ammo.promise],
      ["ammo_gun", gun.promise],
      ["ammo_range", range.promise],
    ]);
    database.read.mockImplementation((table: string) => pendingRows.get(table));

    const result = prepareConfirmedTransaction({ userId: "user-1", input: consumeInput });

    try {
      expect(database.read.mock.calls.map(([table]) => table)).toEqual([
        "ammo_type",
        "ammo_gun",
        "ammo_range",
      ]);
    } finally {
      ammo.resolve([ammoTypeRow]);
      gun.resolve([gunRow]);
      range.resolve([rangeRow]);
    }

    await expect(result).resolves.toMatchObject({
      ok: true,
      prepared: {
        computedRounds: 25,
        normalized: {
          category: "consume",
          quantity: 25,
          ammoTypeName: "12番・散弾",
          location: "射撃場 東京都",
          gunNumber: "12345",
          gunPermitNumber: "67890",
        },
      },
    });
  });

  it.each([
    { ammo: [], gun: [], error: "弾種が見つかりません" },
    { ammo: [ammoTypeRow], gun: [], error: "銃が見つかりません" },
    { ammo: [ammoTypeRow], gun: [gunRow], error: "射撃場が見つかりません" },
  ])("複数マスタが欠けても $error を優先する", async ({ ammo, gun, error }) => {
    const rows = new Map<string, unknown[]>([
      ["ammo_type", ammo],
      ["ammo_gun", gun],
      ["ammo_range", []],
    ]);
    database.read.mockImplementation((table: string) => Promise.resolve(rows.get(table)));

    await expect(
      prepareConfirmedTransaction({ userId: "user-1", input: consumeInput }),
    ).resolves.toEqual({ ok: false, error });
    expect(database.insert).not.toHaveBeenCalled();
  });

  it.each([
    { ammo: [], error: "弾種が見つかりません" },
    { ammo: [ammoTypeRow], error: "譲受日に有効な射撃用の譲受許可がありません" },
  ])("譲受の前段検証が失敗した場合は手入力の相手方を登録しない", async ({ ammo, error }) => {
    database.read.mockImplementation((table: string) =>
      Promise.resolve(table === "ammo_type" ? ammo : []),
    );

    await expect(
      prepareConfirmedTransaction({
        userId: "user-1",
        input: {
          inputKind: "acquire",
          purpose: "shooting",
          occurredOn: "2026-09-10",
          ammoTypeId: "ammo-1",
          outerBoxCount: 0,
          boxCount: 1,
          looseRounds: 0,
          counterpartyName: "銃砲店",
          counterpartyAddress: "東京都",
        },
      }),
    ).resolves.toEqual({ ok: false, error });
    expect(database.insert).not.toHaveBeenCalled();
  });
});
