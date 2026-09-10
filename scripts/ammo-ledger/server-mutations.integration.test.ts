import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

const databaseName = `ammo_server_integration_${crypto.randomUUID().replaceAll("-", "")}`;
let admin: ReturnType<typeof postgres> | undefined;
let sql: ReturnType<typeof postgres>;
let createBulkTransactionsAction: typeof import("@/features/ammo-ledger/transactions/create-bulk-transactions/create-bulk-transactions-action").createBulkTransactionsAction;
let saveOpeningBalanceAction: typeof import("@/features/ammo-ledger/opening-balance/save-opening-balance/save-opening-balance-action").saveOpeningBalanceAction;
let getDb: typeof import("@/db").getDb | undefined;
let databaseCreated = false;

beforeAll(async () => {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("E2E_DATABASE_URL must point to the dedicated local PostgreSQL instance");
  }
  const target = new URL(databaseUrl);
  if (
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    target.hostname !== "127.0.0.1" ||
    target.port !== "55440" ||
    target.pathname !== "/ammo_perf" ||
    target.search !== ""
  ) {
    throw new Error("Integration tests only allow 127.0.0.1:55440/ammo_perf without URL options");
  }

  admin = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  await admin`create database ${admin(databaseName)}`;
  databaseCreated = true;
  target.pathname = `/${databaseName}`;
  sql = postgres(target.toString(), { max: 1, onnotice: () => {} });

  const migrationDirectory = path.resolve(import.meta.dirname, "../../drizzle");
  const journal = JSON.parse(
    await readFile(path.join(migrationDirectory, "meta/_journal.json"), "utf8"),
  ) as { entries: { tag: string }[] };
  for (const migration of journal.entries) {
    const source = await readFile(path.join(migrationDirectory, `${migration.tag}.sql`), "utf8");
    for (const statement of source.split("--> statement-breakpoint")) {
      if (statement.trim()) await sql.unsafe(statement);
    }
  }

  vi.stubEnv("DATABASE_URL", target.toString());
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("BETTER_AUTH_SECRET", "local-integration-auth-secret-00000000000000000000");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3140");
  ({ getDb } = await import("@/db"));
  ({ createBulkTransactionsAction } = await import(
    "@/features/ammo-ledger/transactions/create-bulk-transactions/create-bulk-transactions-action"
  ));
  ({ saveOpeningBalanceAction } = await import(
    "@/features/ammo-ledger/opening-balance/save-opening-balance/save-opening-balance-action"
  ));
});

afterAll(async () => {
  try {
    if (getDb) await getDb().$client.end({ timeout: 5 });
    if (sql) await sql.end({ timeout: 5 });
    if (admin && databaseCreated) await admin`drop database ${admin(databaseName)}`;
  } finally {
    if (admin) await admin.end({ timeout: 5 });
    vi.unstubAllEnvs();
  }
});

async function seedLedger({ stock }: { stock: number }) {
  const id = crypto.randomUUID();
  const fixture = {
    userId: `user-${id}`,
    email: `${id}@ammo-integration.invalid`,
    ammoTypeId: `ammo-${id}`,
    gunId: `gun-${id}`,
    rangeId: `range-${id}`,
    counterpartyId: `counterparty-${id}`,
  };
  await sql`insert into "user" (id, name, email, email_verified)
    values (${fixture.userId}, 'Integration User', ${fixture.email}, true)`;
  await sql`insert into ammo_type
    (id, user_id, name, caliber, cartridge_type, rounds_per_box, classification_confirmed_at)
    values (${fixture.ammoTypeId}, ${fixture.userId}, '12番・散弾', '12', 'shotgun_shot', 25, now())`;
  await sql`insert into ammo_gun
    (id, user_id, name, gun_number, permit_number, gun_type, caliber)
    values (${fixture.gunId}, ${fixture.userId}, '上下二連', '12345', '67890', 'shotgun', '12')`;
  await sql`insert into ammo_range (id, user_id, name, address)
    values (${fixture.rangeId}, ${fixture.userId}, '射撃場', '東京都')`;
  await sql`insert into ammo_counterparty (id, user_id, name, address)
    values (${fixture.counterpartyId}, ${fixture.userId}, '銃砲店', '東京都')`;
  await sql`insert into ammo_acquisition_permit
    (id, user_id, ledger_purpose, name, permit_purpose, granted_on, expires_on, quantity)
    values (${`permit-${id}`}, ${fixture.userId}, 'shooting', 'test', 'shooting',
      '2026-01-01', '2026-12-31', 10000)`;
  await sql`insert into ammo_ledger_entry
    (id, user_id, category, purpose, occurred_on, day_order, ammo_type_id, ammo_type_name, quantity)
    values (${`opening-${id}`}, ${fixture.userId}, 'carryover', 'shooting', '2026-01-01', 0,
      ${fixture.ammoTypeId}, '12番・散弾', ${stock})`;
  vi.stubEnv("AMMO_LEDGER_DEV_USER_EMAIL", fixture.email);
  return fixture;
}

function consumeInput({
  fixture,
  quantity = 1,
}: {
  fixture: Awaited<ReturnType<typeof seedLedger>>;
  quantity?: number;
}) {
  return {
    inputKind: "consume" as const,
    purpose: "shooting" as const,
    occurredOn: "2026-09-10",
    ammoTypeId: fixture.ammoTypeId,
    gunId: fixture.gunId,
    rangeId: fixture.rangeId,
    outerBoxCount: 0,
    boxCount: 0,
    looseRounds: quantity,
  };
}

async function savedCounts({ userId }: { userId: string }) {
  const [result] = await sql`
    select
      (select count(*)::int from ammo_transaction where user_id = ${userId}) as transactions,
      (select count(*)::int from ammo_ledger_entry
        where user_id = ${userId} and transaction_id is not null) as entries`;
  return result;
}

describe("ammo ledger server mutations against local PostgreSQL", () => {
  it("用途別残数がworkspace・編集用集計・棚卸下書きで一致し、取消行を含めない", async () => {
    const fixture = await seedLedger({ stock: 100 });
    await sql`insert into ammo_ledger_entry
      (id, user_id, category, purpose, occurred_on, ammo_type_id, ammo_type_name, quantity, voided_at)
      values
        (${crypto.randomUUID()}, ${fixture.userId}, 'carryover', 'hunting', '2026-01-01',
          ${fixture.ammoTypeId}, '12番・散弾', 50, null),
        (${crypto.randomUUID()}, ${fixture.userId}, 'acquire', 'shooting', '2026-06-01',
          ${fixture.ammoTypeId}, '12番・散弾', 999, now())`;
    await expect(
      createBulkTransactionsAction({ entries: [consumeInput({ fixture, quantity: 10 })] }),
    ).resolves.toMatchObject({ ok: true, createdCount: 1 });
    const { loadAmmoLedgerWorkspace } = await import(
      "@/features/ammo-ledger/workspace/load-ammo-ledger-workspace/load-ammo-ledger-workspace"
    );
    const { getInventorySummary } = await import(
      "@/features/ammo-ledger/ledger/get-inventory-summary/get-inventory-summary"
    );
    const { evaluateHomeStorageLimit } = await import(
      "@/features/ammo-ledger/ledger/compute-running-home-stock/compute-running-home-stock"
    );
    const { createDraftFromDiffAction } = await import(
      "@/features/ammo-ledger/transactions/create-draft/create-draft-action"
    );
    const workspace = await loadAmmoLedgerWorkspace({ userId: fixture.userId });
    expect(workspace.inventoryItems.map((item) => item.bookStock)).toEqual([140]);
    expect(
      (await getInventorySummary({ userId: fixture.userId })).map((item) => item.bookStock),
    ).toEqual([140]);
    expect(
      evaluateHomeStorageLimit({
        entries: workspace.entries.map((entry) => ({
          ...entry,
          category: entry.category as LedgerCategory,
        })),
      }).currentStock,
    ).toBe(140);
    const draft = await createDraftFromDiffAction({
      ammoTypeId: fixture.ammoTypeId,
      actualRounds: 135,
      inputKind: "consume",
      quantity: 5,
    });
    expect(draft).toMatchObject({ ok: true });
    expect(
      await sql`select status, computed_rounds, memo from ammo_transaction
      where user_id = ${fixture.userId} and status = 'draft'`,
    ).toEqual([{ status: "draft", computed_rounds: 5, memo: "棚卸し差分 -5発 からの下書き" }]);
  });

  it("消費編集の元行除外は年度繰越を再評価し、他弾種や保存済み履歴を変更しない", async () => {
    const fixture = await seedLedger({ stock: 400 });
    const olderConsumptionId = crypto.randomUUID();
    const otherAmmoTypeId = crypto.randomUUID();
    await sql`insert into ammo_type (id, user_id, name, caliber, cartridge_type, rounds_per_box)
      values (${otherAmmoTypeId}, ${fixture.userId}, '別弾種', '20', 'shotgun_shot', 25)`;
    await sql`insert into ammo_ledger_entry
      (id, user_id, category, purpose, occurred_on, ammo_type_id, ammo_type_name, quantity)
      values
        (${crypto.randomUUID()}, ${fixture.userId}, 'carryover', 'shooting', '2025-01-01',
          ${fixture.ammoTypeId}, '12番・散弾', 500),
        (${olderConsumptionId}, ${fixture.userId}, 'consume', 'shooting', '2025-06-01',
          ${fixture.ammoTypeId}, '12番・散弾', 100),
        (${crypto.randomUUID()}, ${fixture.userId}, 'carryover', 'shooting', '2025-01-01',
          ${otherAmmoTypeId}, '別弾種', 30)`;
    await expect(
      createBulkTransactionsAction({ entries: [consumeInput({ fixture, quantity: 50 })] }),
    ).resolves.toMatchObject({ ok: true });
    const [latestConsumption] = await sql`select id from ammo_ledger_entry
      where user_id = ${fixture.userId} and transaction_id is not null`;
    const before =
      await sql`select * from ammo_ledger_entry where user_id = ${fixture.userId} order by id`;
    const { getInventorySummary } = await import(
      "@/features/ammo-ledger/ledger/get-inventory-summary/get-inventory-summary"
    );
    for (const [excludedLedgerEntryId, expected] of [
      [undefined, 350],
      [olderConsumptionId, 350],
      [latestConsumption.id as string, 400],
    ] as const) {
      const items = await getInventorySummary({ userId: fixture.userId, excludedLedgerEntryId });
      expect(Object.fromEntries(items.map((item) => [item.ammoType.id, item.bookStock]))).toEqual({
        [fixture.ammoTypeId]: expected,
        [otherAmmoTypeId]: 30,
      });
    }
    expect(
      await sql`select * from ammo_ledger_entry where user_id = ${fixture.userId} order by id`,
    ).toEqual(before);
  });

  it("年初繰越の明示0を新規保存し、選択した用途・弾種だけの前年残数をリセットする", async () => {
    const fixture = await seedLedger({ stock: 10 });
    const otherAmmoTypeId = `other-${fixture.ammoTypeId}`;
    await sql`insert into ammo_type (id, user_id, name, caliber, cartridge_type, rounds_per_box)
      values (${otherAmmoTypeId}, ${fixture.userId}, '別弾種', '12', 'shotgun_shot', 25)`;
    await sql`insert into ammo_ledger_entry
      (id, user_id, category, purpose, occurred_on, ammo_type_id, ammo_type_name, quantity)
      values
        (${crypto.randomUUID()}, ${fixture.userId}, 'carryover', 'hunting', '2026-01-01',
          ${fixture.ammoTypeId}, '12番・散弾', 20),
        (${crypto.randomUUID()}, ${fixture.userId}, 'carryover', 'shooting', '2026-01-01',
          ${otherAmmoTypeId}, '別弾種', 30)`;

    await expect(
      saveOpeningBalanceAction({
        year: 2027,
        purpose: "shooting",
        permitCarryovers: [],
        stockByAmmoType: { [fixture.ammoTypeId]: 0 },
      }),
    ).resolves.toEqual({ ok: true });

    const { listLedgerEntries } = await import(
      "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries"
    );
    const { getOpeningBalance } = await import(
      "@/features/ammo-ledger/opening-balance/get-opening-balance/get-opening-balance"
    );
    const { computeStockByAmmoType } = await import(
      "@/features/ammo-ledger/ledger/compute-stock/compute-stock"
    );
    const entries = await listLedgerEntries({ userId: fixture.userId });
    expect(
      getOpeningBalance({
        year: 2027,
        purpose: "shooting",
        entries,
        permitEvents: [],
        permits: [],
      }),
    ).toEqual({ permitCarryovers: [], stockByAmmoType: { [fixture.ammoTypeId]: 0 } });
    const stockEntries = entries.map((entry) => ({
      ...entry,
      category: entry.category as LedgerCategory,
    }));
    const shootingStock = computeStockByAmmoType({
      entries: stockEntries.filter((entry) => entry.purpose === "shooting"),
    });
    expect(shootingStock.get(fixture.ammoTypeId)).toBe(0);
    expect(shootingStock.get(otherAmmoTypeId)).toBe(30);
    const huntingStock = computeStockByAmmoType({
      entries: stockEntries.filter((entry) => entry.purpose === "hunting"),
    });
    expect(huntingStock.get(fixture.ammoTypeId)).toBe(20);
  });

  it("年初繰越を0へ更新して同じ記録を維持し、空欄相当の省略で取り消す", async () => {
    const fixture = await seedLedger({ stock: 10 });
    const [original] =
      await sql`select id from ammo_ledger_entry where user_id = ${fixture.userId}`;
    const input = { year: 2026, purpose: "shooting", permitCarryovers: [] };
    await expect(
      saveOpeningBalanceAction({ ...input, stockByAmmoType: { [fixture.ammoTypeId]: 0 } }),
    ).resolves.toEqual({ ok: true });
    expect(
      await sql`select id, category, quantity, voided_at from ammo_ledger_entry
        where user_id = ${fixture.userId}`,
    ).toEqual([{ id: original.id, category: "carryover", quantity: 0, voided_at: null }]);

    await expect(saveOpeningBalanceAction({ ...input, stockByAmmoType: {} })).resolves.toEqual({
      ok: true,
    });
    const [cancelled] = await sql`select id, quantity, voided_at is not null as voided
      from ammo_ledger_entry where user_id = ${fixture.userId}`;
    expect(cancelled).toEqual({ id: original.id, quantity: 0, voided: true });
    const { listLedgerEntries } = await import(
      "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries"
    );
    expect(await listLedgerEntries({ userId: fixture.userId })).toEqual([]);
  });

  it("年初繰越の空欄は新しい0記録を作らず、前年の記録を維持する", async () => {
    const fixture = await seedLedger({ stock: 10 });
    const before = await sql`select * from ammo_ledger_entry where user_id = ${fixture.userId}`;
    await expect(
      saveOpeningBalanceAction({
        year: 2027,
        purpose: "shooting",
        permitCarryovers: [],
        stockByAmmoType: {},
      }),
    ).resolves.toEqual({ ok: true });
    expect(await sql`select * from ammo_ledger_entry where user_id = ${fixture.userId}`).toEqual(
      before,
    );
  });

  it.each([
    false,
    true,
  ])("年初繰越の0で後続消費が負在庫になる場合は残弾・許可繰越とも変更しない（既存: %s）", async (existing) => {
    const fixture = await seedLedger({ stock: 10 });
    if (existing) {
      await sql`insert into ammo_ledger_entry
        (id, user_id, category, purpose, occurred_on, ammo_type_id, ammo_type_name, quantity)
        values (${crypto.randomUUID()}, ${fixture.userId}, 'carryover', 'shooting', '2027-01-01',
          ${fixture.ammoTypeId}, '12番・散弾', 10)`;
    }
    await expect(
      createBulkTransactionsAction({
        entries: [{ ...consumeInput({ fixture, quantity: 6 }), occurredOn: "2027-01-02" }],
      }),
    ).resolves.toMatchObject({ ok: true });
    const beforeEntries = await sql`select * from ammo_ledger_entry
      where user_id = ${fixture.userId} order by id`;
    const beforePermits = await sql`select * from ammo_acquisition_permit
      where user_id = ${fixture.userId} order by id`;
    await expect(
      saveOpeningBalanceAction({
        year: 2027,
        purpose: "shooting",
        permitCarryovers: [
          { name: "12番", permitPurpose: "標的射撃", quantity: 100, expiresOn: "2027-12-31" },
        ],
        stockByAmmoType: { [fixture.ammoTypeId]: 0 },
      }),
    ).resolves.toEqual({
      ok: false,
      error: "12番・散弾の在庫が不足しています（残り0発、出庫6発）",
    });
    expect(
      await sql`select * from ammo_ledger_entry where user_id = ${fixture.userId} order by id`,
    ).toEqual(beforeEntries);
    expect(
      await sql`select * from ammo_acquisition_permit where user_id = ${fixture.userId} order by id`,
    ).toEqual(beforePermits);
    expect(await sql`select * from ammo_permit_event where user_id = ${fixture.userId}`).toEqual(
      [],
    );
  });

  it.each([
    { existing: false, normalDayOrder: 0 },
    { existing: true, normalDayOrder: -2 },
  ])("年初繰越は元旦の通常入庫より前に保存する（既存: $existing）", async ({
    existing,
    normalDayOrder,
  }) => {
    const fixture = await seedLedger({ stock: 10 });
    if (existing) {
      await sql`update ammo_ledger_entry set occurred_on = '2027-01-01', day_order = 0
          where user_id = ${fixture.userId}`;
    }
    await sql`insert into ammo_ledger_entry
        (id, user_id, category, purpose, occurred_on, day_order, ammo_type_id, ammo_type_name,
          quantity, created_at)
        values (${crypto.randomUUID()}, ${fixture.userId}, 'receive', 'shooting', '2027-01-01',
          ${normalDayOrder}, ${fixture.ammoTypeId}, '12番・散弾', 10, '2025-01-01T00:00:00Z')`;
    await expect(
      saveOpeningBalanceAction({
        year: 2027,
        purpose: "shooting",
        permitCarryovers: [],
        stockByAmmoType: { [fixture.ammoTypeId]: 3 },
      }),
    ).resolves.toEqual({ ok: true });
    const { listLedgerEntries } = await import(
      "@/features/ammo-ledger/ledger/list-ledger-entries/list-ledger-entries"
    );
    const { computeStockByAmmoType } = await import(
      "@/features/ammo-ledger/ledger/compute-stock/compute-stock"
    );
    const entries = await listLedgerEntries({
      userId: fixture.userId,
      purpose: "shooting",
      from: "2027-01-01",
    });
    expect(entries.map(({ category }) => category)).toEqual(["carryover", "receive"]);
    expect(entries[0].dayOrder).toBeLessThan(normalDayOrder);
    expect(
      computeStockByAmmoType({
        entries: entries.map((entry) => ({ ...entry, category: entry.category as LedgerCategory })),
      }).get(fixture.ammoTypeId),
    ).toBe(13);
  });

  it("最近利用の射撃場と相手方は利用日順の8件に制限し、他ユーザーの記録を含めない", async () => {
    const fixture = await seedLedger({ stock: 10 });
    const otherUser = await seedLedger({ stock: 10 });
    const masters = Array.from({ length: 10 }, (_, index) => ({
      rangeId: `recent-range-${fixture.userId}-${index}`,
      counterpartyId: `recent-counterparty-${fixture.userId}-${index}`,
      name: `最近利用${index}`,
      address: `住所${index}`,
      catalogId: `catalog-${fixture.userId}-${index}`,
    }));
    for (const [index, master] of masters.entries()) {
      await sql`insert into ammo_range (id, user_id, name, address, catalog_id)
        values (${master.rangeId}, ${fixture.userId}, ${master.name}, ${master.address}, ${master.catalogId})`;
      await sql`insert into ammo_counterparty (id, user_id, name, address, catalog_id)
        values (${master.counterpartyId}, ${fixture.userId}, ${master.name}, ${master.address}, ${master.catalogId})`;
      const occurredOn = `2026-09-${String(index + 1).padStart(2, "0")}`;
      await sql`insert into ammo_transaction
        (id, user_id, status, input_kind, purpose, occurred_on, range_id)
        values (${crypto.randomUUID()}, ${fixture.userId}, 'confirmed', 'consume', 'shooting',
          ${occurredOn}, ${master.rangeId})`;
      await sql`insert into ammo_transaction
        (id, user_id, status, input_kind, purpose, occurred_on, counterparty_id)
        values (${crypto.randomUUID()}, ${fixture.userId}, 'confirmed', 'acquire', 'shooting',
          ${occurredOn}, ${master.counterpartyId})`;
    }
    await sql`insert into ammo_transaction
      (id, user_id, status, input_kind, purpose, occurred_on, range_id, counterparty_id)
      values
        (${crypto.randomUUID()}, ${fixture.userId}, 'confirmed', 'consume', 'shooting', '2026-09-30',
          ${masters[0].rangeId}, ${masters[0].counterpartyId}),
        (${crypto.randomUUID()}, ${otherUser.userId}, 'confirmed', 'consume', 'shooting', '2026-12-31',
          ${otherUser.rangeId}, ${otherUser.counterpartyId}),
        (${crypto.randomUUID()}, ${fixture.userId}, 'confirmed', 'consume', 'shooting', '2026-12-30',
          ${otherUser.rangeId}, ${otherUser.counterpartyId}),
        (${crypto.randomUUID()}, ${otherUser.userId}, 'confirmed', 'consume', 'shooting', '2026-12-29',
          ${masters[1].rangeId}, ${masters[1].counterpartyId})`;

    const { listRecentRanges } = await import(
      "@/features/ammo-ledger/catalog/list-recent-ranges/list-recent-ranges"
    );
    const { listRecentCounterparties } = await import(
      "@/features/ammo-ledger/catalog/list-recent-counterparties/list-recent-counterparties"
    );
    const expectedMasters = [0, 9, 8, 7, 6, 5, 4, 3].map((index) => masters[index]);
    const expectedRanges = expectedMasters.map((master) => ({
      id: master.rangeId,
      name: master.name,
      address: master.address,
      catalogId: master.catalogId,
    }));
    const expectedCounterparties = expectedMasters.map((master) => ({
      id: master.counterpartyId,
      name: master.name,
      address: master.address,
      catalogId: master.catalogId,
    }));
    expect(await listRecentRanges({ userId: fixture.userId })).toEqual(expectedRanges);
    expect(await listRecentCounterparties({ userId: fixture.userId })).toEqual(
      expectedCounterparties,
    );
    expect(await listRecentRanges({ userId: fixture.userId, limit: 3 })).toEqual(
      expectedRanges.slice(0, 3),
    );
    expect(await listRecentCounterparties({ userId: fixture.userId, limit: 3 })).toEqual(
      expectedCounterparties.slice(0, 3),
    );
  });

  it("3001件をbind数上限内で保存し、全帳簿の入力順とtransaction対応を保つ", async () => {
    const fixture = await seedLedger({ stock: 3001 });
    const entries = Array.from({ length: 3001 }, (_, index) => ({
      ...consumeInput({ fixture }),
      ledgerNote: `entry-${index}`,
    }));

    await expect(createBulkTransactionsAction({ entries })).resolves.toEqual({
      ok: true,
      createdCount: 3001,
      redirectPath: "/lab/ammo-ledger/ledger?purpose=shooting",
    });
    expect(await savedCounts(fixture)).toEqual({ transactions: 3001, entries: 3001 });
    const rows = await sql`select e.ledger_note, e.day_order, e.quantity, t.computed_rounds,
      e.ammo_type_id = t.ammo_type_id and e.user_id = t.user_id as linked
      from ammo_ledger_entry e join ammo_transaction t on e.transaction_id = t.id
      where e.user_id = ${fixture.userId} order by e.day_order`;
    expect(rows).toEqual(
      entries.map((entry, index) => ({
        ledger_note: entry.ledgerNote,
        day_order: index,
        quantity: 1,
        computed_rounds: 1,
        linked: true,
      })),
    );
  });

  it("同じ一括登録内の譲受を後続消費に充当する", async () => {
    const fixture = await seedLedger({ stock: 0 });
    const acquire = {
      inputKind: "acquire",
      purpose: "shooting",
      occurredOn: "2026-09-10",
      ammoTypeId: fixture.ammoTypeId,
      counterpartyId: fixture.counterpartyId,
      boxCount: 1,
      looseRounds: 0,
    };

    await expect(
      createBulkTransactionsAction({ entries: [acquire, consumeInput({ fixture, quantity: 25 })] }),
    ).resolves.toMatchObject({ ok: true, createdCount: 2 });
    const rows = await sql`select category, day_order, quantity from ammo_ledger_entry
      where user_id = ${fixture.userId} and transaction_id is not null order by day_order`;
    expect(rows).toEqual([
      { category: "acquire", day_order: 0, quantity: 25 },
      { category: "consume", day_order: 1, quantity: 25 },
    ]);
  });

  it("一括消費で在庫が不足した場合は両テーブルとも保存しない", async () => {
    const fixture = await seedLedger({ stock: 10 });
    await expect(
      createBulkTransactionsAction({
        entries: [consumeInput({ fixture, quantity: 6 }), consumeInput({ fixture, quantity: 6 })],
      }),
    ).resolves.toEqual({
      ok: false,
      error: "12番・散弾の在庫が不足しています（残り4発、出庫6発）",
    });
    expect(await savedCounts(fixture)).toEqual({ transactions: 0, entries: 0 });
  });

  it("ロック期間への登録を拒否して両テーブルを維持する", async () => {
    const fixture = await seedLedger({ stock: 10 });
    await sql`insert into ammo_ledger_lock_event (id, user_id, event_kind, locked_through)
      values (${crypto.randomUUID()}, ${fixture.userId}, 'lock', '2026-09-10')`;
    const result = await createBulkTransactionsAction({ entries: [consumeInput({ fixture })] });
    expect(result).toMatchObject({ ok: false });
    expect(result).toHaveProperty("error", expect.stringContaining("ロック"));
    expect(await savedCounts(fixture)).toEqual({ transactions: 0, entries: 0 });
  });

  it("帳簿の第2batchでDB制約違反が起きた場合は先行batchも全件rollbackする", async () => {
    const fixture = await seedLedger({ stock: 501 });
    await sql`alter table ammo_ledger_entry add constraint ammo_integration_failure
      check (ledger_note is distinct from '__integration_fail__')`;
    try {
      const entries = Array.from({ length: 501 }, (_, index) => ({
        ...consumeInput({ fixture }),
        ledgerNote: index === 500 ? "__integration_fail__" : "valid",
      }));
      await expect(createBulkTransactionsAction({ entries })).rejects.toMatchObject({
        cause: { code: "23514", constraint_name: "ammo_integration_failure" },
      });
      expect(await savedCounts(fixture)).toEqual({ transactions: 0, entries: 0 });
      const [opening] = await sql`select quantity from ammo_ledger_entry
        where user_id = ${fixture.userId}`;
      expect(opening).toEqual({ quantity: 501 });
    } finally {
      await sql`alter table ammo_ledger_entry drop constraint ammo_integration_failure`;
    }
  });

  it("並列の消費登録はadvisory lockで直列化し、負在庫を作らない", async () => {
    const fixture = await seedLedger({ stock: 10 });
    const input = { entries: [consumeInput({ fixture, quantity: 6 })] };
    const results = await Promise.all([
      createBulkTransactionsAction(input),
      createBulkTransactionsAction(input),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      { ok: false, error: "12番・散弾の在庫が不足しています（残り4発、出庫6発）" },
    ]);
    expect(await savedCounts(fixture)).toEqual({ transactions: 1, entries: 1 });
  });

  it.each([
    { field: "ammoTypeId", error: "1件目: 弾種が見つかりません" },
    { field: "gunId", error: "1件目: 銃が見つかりません" },
    { field: "rangeId", error: "1件目: 射撃場が見つかりません" },
  ] as const)("他ユーザーの $field を拒否して保存しない", async ({ field, error }) => {
    const otherUser = await seedLedger({ stock: 10 });
    const fixture = await seedLedger({ stock: 10 });
    await expect(
      createBulkTransactionsAction({
        entries: [{ ...consumeInput({ fixture }), [field]: otherUser[field] }],
      }),
    ).resolves.toEqual({ ok: false, error });
    expect(await savedCounts(fixture)).toEqual({ transactions: 0, entries: 0 });
    expect(await savedCounts(otherUser)).toEqual({ transactions: 0, entries: 0 });
  });
});
