import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import type { Page, Request } from "@playwright/test";
import { consumePath, expect, ledgerPath, test } from "./fixtures";

// The baseline used an argument-free Server Action for this same public read.
function isWorkspaceRead(request: Request): boolean {
  return (
    (request.method() === "GET" &&
      new URL(request.url()).pathname === "/api/ammo-ledger/workspace") ||
    (request.method() === "POST" &&
      Boolean(request.headers()["next-action"]) &&
      request.postData() === "[]")
  );
}

async function fillConsumption({
  page,
  ammoTypeId,
  gunId,
  consumedOn,
}: {
  page: Page;
  ammoTypeId: string;
  gunId: string;
  consumedOn: string;
}) {
  await expect(page.getByRole("heading", { name: "消費した", exact: true })).toBeVisible();
  await page.locator('input[type="date"]').fill(consumedOn);
  await page.getByLabel("銃", { exact: true }).selectOption(gunId);
  await page.getByLabel("弾", { exact: true }).selectOption(ammoTypeId);
  await page.getByRole("button", { name: "場所", exact: true }).click();
  await page
    .getByRole("button", { name: /E2E架空射撃場/ })
    .first()
    .click();
  await page.getByLabel("小箱", { exact: true }).fill("1");
  await expect(page.getByRole("button", { name: "保存", exact: true })).toBeEnabled();
}

function visibleEntry({ page, id }: { page: Page; id: string }) {
  return page.locator(`[data-ledger-entry-id="${id}"]:visible`);
}

test("消費保存後は帳簿の再取得を待たずに戻り、完了後に保存した数量を表示する", async ({
  page,
  ledger,
}, testInfo) => {
  await page.goto(consumePath);
  await fillConsumption({ page, ...ledger });

  let releaseRead = () => {};
  let readStarted = () => {};
  let heldReadCompleted = false;
  const held = new Promise<void>((resolve) => {
    releaseRead = resolve;
  });
  const started = new Promise<void>((resolve) => {
    readStarted = resolve;
  });
  await page.route("**/*", async (route) => {
    if (!isWorkspaceRead(route.request())) {
      await route.continue();
      return;
    }
    readStarted();
    await held;
    await route.continue();
    heldReadCompleted = true;
  });

  const start = performance.now();
  try {
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await started;
    await expect(page).toHaveURL(/\/ledger\?purpose=shooting&entry=/, { timeout: 3_000 });
    await expect(page.getByRole("heading", { name: "帳簿", exact: true })).toBeVisible();
    expect(heldReadCompleted).toBe(false);
    await expect(page.getByText("記録は保存済みです。帳簿の表示を更新しています…")).toBeVisible();
    const measurementPath = testInfo.outputPath("save-to-ledger.json");
    await writeFile(
      measurementPath,
      JSON.stringify({ milliseconds: Math.round(performance.now() - start) }),
    );
    await testInfo.attach("save-to-ledger-ms", {
      path: measurementPath,
      contentType: "application/json",
    });
  } finally {
    releaseRead();
  }

  const entryId = new URL(page.url()).searchParams.get("entry");
  expect(entryId).toEqual(expect.any(String));
  await expect(visibleEntry({ page, id: entryId as string })).toContainText("25");
  const entries = await ledger.sql`
    select id, quantity, purpose from ammo_ledger_entry
    where user_id = ${ledger.userId} and id = ${entryId as string}
  `;
  expect(entries).toEqual([{ id: entryId, quantity: 25, purpose: "shooting" }]);
  await expect(page.getByText("追加した記録を強調表示しています。")).toBeVisible();
});

test("帳簿データの通信失敗を表示し、再試行で入力画面を復旧する", async ({ page, ledger }) => {
  let rejectRead = true;
  await page.route("**/*", async (route) => {
    if (rejectRead && isWorkspaceRead(route.request())) {
      await route.abort("failed");
      return;
    }
    await route.continue();
  });
  await page.goto(consumePath);
  const readError = page
    .getByRole("alert")
    .filter({ has: page.getByRole("button", { name: "再試行", exact: true }) });
  await expect(readError).toBeVisible();
  await expect(page.getByRole("button", { name: "再試行", exact: true })).toBeEnabled();
  rejectRead = false;
  await page.getByRole("button", { name: "再試行", exact: true }).click();
  await fillConsumption({ page, ...ledger });
  await expect(readError).toHaveCount(0);
});

test("未確定プレビューの確定後に正式帳票を印刷し、解除後は帳簿の編集操作が復旧する", async ({
  page,
  ledger,
  isMobile,
}, testInfo) => {
  const printCalls: { url: string; previewText: boolean }[] = [];
  await page.exposeFunction("recordLedgerPrint", (call: (typeof printCalls)[number]) => {
    printCalls.push(call);
  });
  await page.addInitScript(() => {
    window.print = () => {
      const capture = window as typeof window & {
        recordLedgerPrint: (call: { url: string; previewText: boolean }) => void;
      };
      capture.recordLedgerPrint({
        url: window.location.href,
        previewText: document.body.innerText.includes("未確定プレビュー"),
      });
    };
  });
  await page.goto(consumePath);
  await expect(page.getByRole("heading", { name: "消費した", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "帳簿", exact: true }).click();
  await expect(visibleEntry({ page, id: ledger.consumedEntryId })).toBeVisible();
  await page.getByLabel("印刷する年").selectOption(String(ledger.year));
  await page.getByRole("button", { name: `${ledger.year}年を印刷する →` }).click();
  await page.getByRole("link", { name: "未確定プレビュー", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`year=${ledger.year}&preview=1`));
  await page.getByRole("button", { name: /まで確定して印刷$/ }).click();
  await page.getByRole("checkbox", { name: "上記を理解し、確定します" }).check();
  await page.getByRole("button", { name: "確定して印刷", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("ロック前の未確定プレビューです。正式な提出用帳簿ではありません。"),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "印刷", exact: true })).toBeVisible();
  await expect.poll(() => printCalls.length).toBe(1);
  expect(printCalls[0].previewText).toBe(false);
  expect(new URL(printCalls[0].url).searchParams.get("year")).toBe(String(ledger.year));
  await expect(page.getByRole("button", { name: "印刷", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("official-ledger-print.png"), fullPage: true });
  const preview = page.getByRole("region", { name: "帳票プレビュー", exact: true });
  if (isMobile) {
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(await preview.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
      true,
    );
    await preview.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    const bounds = await preview.boundingBox();
    expect(bounds).not.toBeNull();
    const consumedPrintRow = preview.getByRole("row").filter({
      has: page.getByRole("cell", { name: "消費", exact: true }),
    });
    const gunCell = consumedPrintRow.getByRole("cell").nth(8);
    const remarksCell = consumedPrintRow.getByRole("cell").nth(9);
    await expect(gunCell).toContainText("E2E架空銃");
    await expect(remarksCell).toContainText("E2E架空射撃場");
    for (const cell of [gunCell, remarksCell]) {
      const textBounds = await cell.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const rectangle = range.getBoundingClientRect();
        return { left: rectangle.left, right: rectangle.right };
      });
      expect(textBounds.left).toBeGreaterThanOrEqual((bounds?.x ?? 0) - 1);
      expect(textBounds.right).toBeLessThanOrEqual((bounds?.x ?? 0) + (bounds?.width ?? 0) + 1);
    }
    await page.screenshot({
      path: testInfo.outputPath("official-ledger-print-right-edge.png"),
      fullPage: true,
    });
    await preview.evaluate((element) => {
      element.scrollLeft = 0;
    });
  }
  await page.emulateMedia({ media: "print" });
  expect(await preview.evaluate((element) => getComputedStyle(element).overflowX)).toBe("visible");
  expect(
    await preview.evaluate((element) =>
      [...element.children].every((child) => getComputedStyle(child).minWidth === "0px"),
    ),
  ).toBe(true);
  await page.emulateMedia({ media: "screen" });
  const lockEvents = await ledger.sql`
    select event_kind, locked_through from ammo_ledger_lock_event where user_id = ${ledger.userId}
  `;
  expect(lockEvents).toEqual([{ event_kind: "lock", locked_through: `${ledger.year}-12-31` }]);

  await page.getByRole("link", { name: "← 帳簿に戻る" }).click();
  await visibleEntry({ page, id: ledger.consumedEntryId }).click();
  await expect(page.getByText("この期間はロック済みのため編集・取消できません。")).toBeVisible();
  await expect(page.getByRole("link", { name: "編集", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("link", { name: "帳簿の確定・ロック" }).click();
  await page.getByRole("button", { name: "ロックを解除する…", exact: true }).click();
  await page.getByRole("dialog").locator('input[type="date"]').fill(`${ledger.year}-12-31`);
  await page.getByLabel(/確認文を入力/).fill("帳簿のロックを解除する");
  await page
    .getByLabel("理由（10〜500文字）")
    .fill("E2Eで帳簿の編集状態が復旧することを確認するため");
  await page.getByRole("button", { name: "解除する", exact: true }).click();
  await expect(page.getByText("ロック状態: 未ロック", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "帳簿", exact: true }).click();
  await visibleEntry({ page, id: ledger.consumedEntryId }).click();
  await expect(page.getByRole("link", { name: "編集", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "取消", exact: true })).toBeVisible();
  const unlocked = await ledger.sql`
    select event_kind from ammo_ledger_lock_event where user_id = ${ledger.userId}
    order by created_at
  `;
  expect(unlocked.map((event) => event.event_kind)).toEqual(["lock", "unlock"]);
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("unlocked-ledger.png"), fullPage: true });
});

test("消費保存の通信例外で保存中を解除し、再試行しても二重登録しない", async ({ page, ledger }) => {
  await page.goto(consumePath);
  await fillConsumption({ page, ...ledger });
  let rejectSave = true;
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (
      rejectSave &&
      request.method() === "POST" &&
      request.headers()["next-action"] &&
      request.postData()?.includes('"inputKind":"consume"')
    ) {
      await route.abort("failed");
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByRole("button", { name: "保存", exact: true })).toBeEnabled();
  await expect(
    page.getByText("通信に失敗しました。帳簿で保存状況を確認してから、再試行してください。", {
      exact: true,
    }),
  ).toBeVisible();
  const beforeRetry = await ledger.sql`
    select quantity from ammo_ledger_entry
    where user_id = ${ledger.userId} and category = 'consume'
  `;
  expect(beforeRetry).toEqual([{ quantity: 10 }]);
  rejectSave = false;
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page).toHaveURL(/\/ledger\?purpose=shooting&entry=/);
  const afterRetry = await ledger.sql`
    select quantity from ammo_ledger_entry
    where user_id = ${ledger.userId} and category = 'consume' order by quantity
  `;
  expect(afterRetry).toEqual([{ quantity: 10 }, { quantity: 25 }]);
});

test("用途クエリを切り替えてもブラウザの戻る・進むと帳簿表示が一致する", async ({
  page,
  ledger,
}) => {
  await page.goto(`${ledgerPath}?purpose=hunting&entry=${ledger.huntingCarryoverId}`);
  await expect(page.getByText("狩猟の法定記録", { exact: true })).toBeVisible();
  await expect(visibleEntry({ page, id: ledger.huntingCarryoverId })).toBeVisible();
  await page.getByRole("button", { name: "残弾", exact: true }).click();
  await expect(page).toHaveURL(/\/inventory$/);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`purpose=hunting&entry=${ledger.huntingCarryoverId}`));
  await expect(page.getByText("狩猟の法定記録", { exact: true })).toBeVisible();
  await expect(visibleEntry({ page, id: ledger.huntingCarryoverId })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/inventory$/);
  await page.goBack();
  await page.getByRole("button", { name: "射撃用 2件", exact: true }).click();
  await expect(page).toHaveURL(/purpose=shooting/);
  await expect(page.getByText("射撃の法定記録", { exact: true })).toBeVisible();
  await expect(visibleEntry({ page, id: ledger.consumedEntryId })).toBeVisible();
  await expect(visibleEntry({ page, id: ledger.huntingCarryoverId })).toHaveCount(0);
});
