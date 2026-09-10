import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { consumePath, expect, ledgerPath, test } from "./fixtures";

type WorkspaceInventory = {
  workspace: {
    inventoryItems: { ammoType: { id: string }; bookStock: number }[];
  };
};

async function expectWorkspaceStock({
  page,
  ammoTypeId,
  quantity,
}: {
  page: Page;
  ammoTypeId: string;
  quantity: number;
}) {
  const response = await page.request.get("/api/ammo-ledger/workspace");
  expect(response.status()).toBe(200);
  const payload = (await response.json()) as WorkspaceInventory;
  expect(
    payload.workspace.inventoryItems.map((item) => ({
      ammoTypeId: item.ammoType.id,
      quantity: item.bookStock,
    })),
  ).toEqual([{ ammoTypeId, quantity }]);
}

async function expectCurrentStockEverywhere({
  page,
  ammoTypeId,
  quantity,
}: {
  page: Page;
  ammoTypeId: string;
  quantity: number;
}) {
  await expectWorkspaceStock({ page, ammoTypeId, quantity });
  await page.goto(consumePath);
  await expect(page.getByRole("heading", { name: "消費した", exact: true })).toBeVisible();
  await expect(
    page.getByLabel("弾", { exact: true }).locator(`option[value="${ammoTypeId}"]`),
  ).toHaveText(`E2E架空実包（1箱25発 · 全用途の残${quantity}個）`);

  await page.getByRole("button", { name: "残弾", exact: true }).click();
  await expect(page.getByRole("heading", { name: "残弾確認", exact: true })).toBeVisible();
  const inventoryRow = page.getByRole("row").filter({
    has: page.getByRole("cell", { name: "E2E架空実包", exact: true }),
  });
  await expect(inventoryRow.getByRole("cell").last()).toHaveText(`${quantity}個`);
  await expect(page.getByText(`表示中の合計: ${quantity}個`, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "帳簿", exact: true }).click();
  await expect(page.getByRole("heading", { name: "帳簿", exact: true })).toBeVisible();
  await expect(
    page
      .locator("dl > div")
      .filter({
        has: page.getByText("帳簿残数（全用途）", { exact: true }),
      })
      .getByRole("definition"),
  ).toHaveText(`${quantity}個`);

  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("link", { name: /譲受許可申請書/ }).click();
  await expect(page.getByLabel("現保有数量（発）", { exact: true })).toHaveValue(String(quantity));
}

test("用途別在庫を合計し、翌年繰越と旧年消費の編集後も各画面の残数が一致する", async ({
  page,
  ledger,
}) => {
  await expectCurrentStockEverywhere({ page, ammoTypeId: ledger.ammoTypeId, quantity: 140 });

  await ledger.sql`
    insert into ammo_ledger_entry
      (id, user_id, category, purpose, occurred_on, ammo_type_id, ammo_type_name,
       ammo_cartridge_type, ammo_caliber, ammo_gauge_number, quantity)
    values
      (${randomUUID()}, ${ledger.userId}, 'carryover', 'shooting',
       ${`${ledger.year + 1}-01-01`}, ${ledger.ammoTypeId}, 'E2E架空実包',
       'shotgun_shot', '12', '7.5', 90)
  `;
  await expectCurrentStockEverywhere({ page, ammoTypeId: ledger.ammoTypeId, quantity: 140 });

  await page.goto(`/lab/ammo-ledger/entries/${ledger.consumedEntryId}/edit`);
  await expect(page.getByRole("heading", { name: "消費記録を編集", exact: true })).toBeVisible();
  await expect(
    page.getByLabel("弾", { exact: true }).locator(`option[value="${ledger.ammoTypeId}"]`),
  ).toHaveText("E2E架空実包（1箱25発 · 全用途の残140個）");
  await page.getByLabel("バラ（±）", { exact: true }).fill("5");
  await page.getByRole("button", { name: "更新", exact: true }).click();
  await expect(page).toHaveURL(`${ledgerPath}?purpose=shooting`);
  const edited = await ledger.sql`
    select entry.quantity, transaction.computed_rounds
    from ammo_ledger_entry as entry
    join ammo_transaction as transaction on transaction.id = entry.transaction_id
    where entry.user_id = ${ledger.userId} and entry.id = ${ledger.consumedEntryId}
  `;
  expect(edited).toEqual([{ quantity: 5, computed_rounds: 5 }]);
  await expectCurrentStockEverywhere({ page, ammoTypeId: ledger.ammoTypeId, quantity: 140 });
});

test("年初繰越の空欄は未登録、明示0は在庫を0に設定して再読込できる", async ({ page, ledger }) => {
  const year = ledger.year + 1;
  const openingPath = `/lab/ammo-ledger/settings/opening-balance?year=${year}&purpose=shooting`;
  const saveName = `${year}年 射撃 の繰越を保存`;
  const stockInput = page
    .getByRole("row")
    .filter({
      has: page.getByRole("cell", { name: "E2E架空実包", exact: true }),
    })
    .getByRole("spinbutton");

  await page.goto(consumePath);
  await expect(page.getByRole("heading", { name: "消費した", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("link", { name: /年初繰越/ }).click();
  await expect(stockInput).toHaveValue("");
  await page.getByRole("button", { name: saveName, exact: true }).click();
  await expect(page).toHaveURL(`${ledgerPath}?purpose=shooting`);
  const blankEntries = await ledger.sql`
    select quantity from ammo_ledger_entry
    where user_id = ${ledger.userId} and category = 'carryover' and purpose = 'shooting'
      and occurred_on = ${`${year}-01-01`} and voided_at is null
  `;
  expect(blankEntries).toEqual([]);
  await expectWorkspaceStock({ page, ammoTypeId: ledger.ammoTypeId, quantity: 140 });

  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("link", { name: /年初繰越/ }).click();
  await expect(stockInput).toHaveValue("");
  await stockInput.fill("0");
  await page.getByRole("button", { name: saveName, exact: true }).click();
  await expect(page).toHaveURL(`${ledgerPath}?purpose=shooting`);
  const zeroEntries = await ledger.sql`
    select quantity from ammo_ledger_entry
    where user_id = ${ledger.userId} and category = 'carryover' and purpose = 'shooting'
      and occurred_on = ${`${year}-01-01`} and voided_at is null
  `;
  expect(zeroEntries).toEqual([{ quantity: 0 }]);
  await expectWorkspaceStock({ page, ammoTypeId: ledger.ammoTypeId, quantity: 50 });

  await page.goto(openingPath);
  await expect(stockInput).toHaveValue("0");
  await stockInput.fill("");
  await page.getByRole("button", { name: saveName, exact: true }).click();
  await expect(page).toHaveURL(`${ledgerPath}?purpose=shooting`);
  const removedEntries = await ledger.sql`
    select quantity from ammo_ledger_entry
    where user_id = ${ledger.userId} and category = 'carryover' and purpose = 'shooting'
      and occurred_on = ${`${year}-01-01`} and voided_at is null
  `;
  expect(removedEntries).toEqual([]);
  await expectWorkspaceStock({ page, ammoTypeId: ledger.ammoTypeId, quantity: 140 });
  await page.goto(openingPath);
  await expect(stockInput).toHaveValue("");
});
