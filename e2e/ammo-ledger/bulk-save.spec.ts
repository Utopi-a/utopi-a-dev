import { expect, test } from "./fixtures";

test("一括消費の在庫不足は全件を保存せず、訂正後は同日の順序と数量をまとめて保存する", async ({
  page,
  ledger,
}) => {
  await page.goto("/lab/ammo-ledger/bulk/new");
  await expect(page.getByRole("heading", { name: "まとめて追加", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "+ 消費を追加", exact: true }).click();

  for (const row of await page.getByRole("article").all()) {
    await row.locator('input[type="date"]').fill(ledger.consumedOn);
    await row.getByLabel("弾", { exact: true }).selectOption(ledger.ammoTypeId);
    await row.getByLabel("銃", { exact: true }).selectOption(ledger.gunId);
    await row.getByLabel("場所", { exact: true }).click();
    await page
      .getByRole("button", { name: /E2E架空射撃場/ })
      .first()
      .click();
    await row.locator('input[id="box-count"]').fill("2");
  }

  await page.getByRole("button", { name: "2件をまとめて保存", exact: true }).click();
  await expect(page.getByText(/E2E架空実包の在庫が不足しています/)).toBeVisible();
  await expect(page.getByRole("button", { name: "2件をまとめて保存", exact: true })).toBeEnabled();
  const rejectedEntries = await ledger.sql`
    select id from ammo_ledger_entry where user_id = ${ledger.userId} order by id
  `;
  expect(rejectedEntries.map((entry) => entry.id)).toEqual(
    [ledger.shootingCarryoverId, ledger.huntingCarryoverId, ledger.consumedEntryId].sort(),
  );
  const rejectedTransactions = await ledger.sql`
    select computed_rounds from ammo_transaction where user_id = ${ledger.userId}
  `;
  expect(rejectedTransactions).toEqual([{ computed_rounds: 10 }]);

  await page.getByRole("article").nth(1).locator('input[id="box-count"]').fill("1");
  await page.getByRole("button", { name: "2件をまとめて保存", exact: true }).click();
  await expect(page).toHaveURL(/\/ledger\?purpose=shooting$/);
  await expect(page.getByRole("button", { name: "射撃用 4件", exact: true })).toBeVisible();
  const saved = await ledger.sql`
    select quantity, day_order from ammo_ledger_entry
    where user_id = ${ledger.userId} and category = 'consume'
    order by day_order
  `;
  expect(saved).toEqual([
    { quantity: 10, day_order: 0 },
    { quantity: 50, day_order: 1 },
    { quantity: 25, day_order: 2 },
  ]);
  const savedTransactions = await ledger.sql`
    select computed_rounds from ammo_transaction where user_id = ${ledger.userId}
    order by computed_rounds
  `;
  expect(savedTransactions).toEqual([
    { computed_rounds: 10 },
    { computed_rounds: 25 },
    { computed_rounds: 50 },
  ]);
});
