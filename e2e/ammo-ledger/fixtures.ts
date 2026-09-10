import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { test as base, expect } from "@playwright/test";
import postgres, { type Sql } from "postgres";

export const ledgerPath = "/lab/ammo-ledger/ledger";
export const consumePath = "/lab/ammo-ledger/consume/new";

type LedgerFixture = {
  sql: Sql;
  userId: string;
  ammoTypeId: string;
  gunId: string;
  consumedEntryId: string;
  shootingCarryoverId: string;
  huntingCarryoverId: string;
  year: number;
  consumedOn: string;
};

function localTestDatabaseUrl(): string {
  const value = process.env.E2E_DATABASE_URL;
  if (!value) {
    throw new Error("実包帳簿E2Eには専用ローカルDBの E2E_DATABASE_URL が必要です。");
  }
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !/(?:test|e2e|ammo_perf)/i.test(url.pathname)
  ) {
    throw new Error("E2E_DATABASE_URL は test/e2e/ammo_perf を含むローカル専用DBに限定します。");
  }
  return value;
}

export const test = base.extend<{ ledger: LedgerFixture }>({
  serviceWorkers: "block",
  ledger: async ({ page, baseURL }, use) => {
    const sql = postgres(localTestDatabaseUrl(), { max: 1 });
    if (!baseURL || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)) {
      throw new Error("実包帳簿E2Eの PLAYWRIGHT_BASE_URL は localhost に限定します。");
    }

    let userId: string | undefined;
    try {
      const suffix = randomUUID();
      // Each synthetic account represents a separate client; do not share the sign-up rate bucket.
      const clientIp = `127.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
      const response = await page.request.post("/api/auth/sign-up/email", {
        headers: { origin: baseURL, "x-forwarded-for": clientIp },
        data: {
          email: `ammo-e2e-${suffix}@example.invalid`,
          password: randomBytes(24).toString("base64url"),
          name: "帳簿E2E 架空利用者",
        },
      });
      expect(response.status(), await response.text()).toBe(200);
      const account = (await response.json()) as { user: { id: string } };
      userId = account.user.id;
      expect(userId).toEqual(expect.any(String));

      const ammoTypeId = randomUUID();
      const gunId = randomUUID();
      const rangeId = randomUUID();
      const transactionId = randomUUID();
      const consumedEntryId = randomUUID();
      const shootingCarryoverId = randomUUID();
      const huntingCarryoverId = randomUUID();
      const year = new Date().getFullYear() - 1;
      const consumedOn = `${year}-06-15`;

      await sql.begin(async (tx) => {
        await tx`
          insert into ammo_type
            (id, user_id, name, caliber, cartridge_type, gauge_number, rounds_per_box,
             classification_confirmed_at, default_purpose)
          values (${ammoTypeId}, ${userId as string}, 'E2E架空実包', '12', 'shotgun_shot', '7.5', 25,
                  now(), 'shooting')
        `;
        await tx`
          insert into ammo_gun (id, user_id, name, gun_number, permit_number, gun_type, caliber)
          values (${gunId}, ${userId as string}, 'E2E架空銃', 'E2E-GUN-001', 'E2E-PERMIT-001',
                  '上下二連', '12')
        `;
        await tx`
          insert into ammo_range (id, user_id, name, address)
          values (${rangeId}, ${userId as string}, 'E2E架空射撃場', '東京都架空町1-2-3')
        `;
        await tx`
          insert into ammo_ledger_profile (user_id, owner_name, owner_address)
          values (${userId as string}, '帳簿E2E 架空利用者', '東京都架空町1-2-3')
        `;
        await tx`
          insert into ammo_ledger_entry
            (id, user_id, category, purpose, occurred_on, ammo_type_id, ammo_type_name,
             ammo_cartridge_type, ammo_caliber, ammo_gauge_number, quantity)
          values
            (${shootingCarryoverId}, ${userId as string}, 'carryover', 'shooting',
             ${`${year}-01-01`}, ${ammoTypeId}, 'E2E架空実包', 'shotgun_shot', '12', '7.5', 100),
            (${huntingCarryoverId}, ${userId as string}, 'carryover', 'hunting',
             ${`${year}-01-01`}, ${ammoTypeId}, 'E2E架空実包', 'shotgun_shot', '12', '7.5', 50)
        `;
        await tx`
          insert into ammo_transaction
            (id, user_id, status, input_kind, purpose, occurred_on, ammo_type_id, gun_id,
             range_id, loose_rounds, computed_rounds)
          values (${transactionId}, ${userId as string}, 'confirmed', 'consume', 'shooting',
                  ${consumedOn}, ${ammoTypeId}, ${gunId}, ${rangeId}, 10, 10)
        `;
        await tx`
          insert into ammo_ledger_entry
            (id, user_id, transaction_id, category, purpose, occurred_on, ammo_type_id,
             ammo_type_name, ammo_cartridge_type, ammo_caliber, ammo_gauge_number, quantity,
             location, gun_id, gun_name, gun_number, gun_permit_number)
          values (${consumedEntryId}, ${userId as string}, ${transactionId}, 'consume', 'shooting',
                  ${consumedOn}, ${ammoTypeId}, 'E2E架空実包', 'shotgun_shot', '12', '7.5', 10,
                  'E2E架空射撃場', ${gunId}, 'E2E架空銃', 'E2E-GUN-001', 'E2E-PERMIT-001')
        `;
      });

      await use({
        sql,
        userId,
        ammoTypeId,
        gunId,
        consumedEntryId,
        shootingCarryoverId,
        huntingCarryoverId,
        year,
        consumedOn,
      });
    } finally {
      if (userId) {
        await sql`delete from "user" where id = ${userId}`;
      }
      await sql.end();
    }
  },
});

export { expect };
