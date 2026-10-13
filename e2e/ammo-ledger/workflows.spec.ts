import { writeFile } from "node:fs/promises";
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

function isConsumeSave(request: Request): boolean {
  return (
    request.method() === "POST" &&
    Boolean(request.headers()["next-action"]) &&
    Boolean(request.postData()?.includes('"inputKind":"consume"'))
  );
}

test("消費は保存の応答を待たずに帳簿へ先行表示し、確定後も全帳簿の再取得を待たない", async ({
  page,
  ledger,
}, testInfo) => {
  await page.goto(consumePath);
  await fillConsumption({ page, ...ledger });

  let releaseSave = () => {};
  const heldSave = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  let releaseRead = () => {};
  let readStarted = () => {};
  let heldReadCompleted = false;
  const heldRead = new Promise<void>((resolve) => {
    releaseRead = resolve;
  });
  const started = new Promise<void>((resolve) => {
    readStarted = resolve;
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (isConsumeSave(request)) {
      await heldSave;
      await route.continue();
      return;
    }
    if (!isWorkspaceRead(request)) {
      await route.continue();
      return;
    }
    readStarted();
    await heldRead;
    await route.continue();
    heldReadCompleted = true;
  });

  try {
    // クリックから保存中の行が描画されるまでを、テストランナーの待機を含めずにページ内で測る。
    const milliseconds = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const button = [...document.querySelectorAll("button")].find(
            (element) => element.textContent?.trim() === "保存",
          );
          const start = performance.now();
          const observer = new MutationObserver(() => {
            const rows = [...document.querySelectorAll("[data-ledger-entry-id]")];
            if (rows.some((row) => row.textContent?.includes("保存中"))) {
              observer.disconnect();
              resolve(Math.round(performance.now() - start));
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
          button?.click();
        }),
    );
    await expect(page).toHaveURL(/\/ledger\?purpose=shooting&entry=[0-9a-f-]{36}$/, {
      timeout: 3_000,
    });
    await expect(page.getByRole("heading", { name: "帳簿", exact: true })).toBeVisible();
    // 画面で決めた記録 ID を保存後もそのまま使う。
    const entryId = new URL(page.url()).searchParams.get("entry") as string;
    const pendingEntry = visibleEntry({ page, id: entryId });
    await expect(pendingEntry).toContainText("保存中");
    await expect(pendingEntry).toContainText("25");
    const measurementPath = testInfo.outputPath("save-to-ledger.json");
    await writeFile(measurementPath, JSON.stringify({ milliseconds }));
    await testInfo.attach("save-to-ledger-ms", {
      path: measurementPath,
      contentType: "application/json",
    });
    const beforeSave = await ledger.sql`
      select id from ammo_ledger_entry where user_id = ${ledger.userId} and quantity = 25
    `;
    expect(beforeSave).toEqual([]);

    releaseSave();
    await started;
    await expect(page.getByText("消費記録を保存しました", { exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("entry")).toBe(entryId);
    await expect(visibleEntry({ page, id: entryId })).toContainText("25");
    await expect(visibleEntry({ page, id: entryId })).not.toContainText("保存中");
    await expect(page.getByText("保存した記録を強調表示しています。")).toBeVisible();
    expect(heldReadCompleted).toBe(false);
    const entries = await ledger.sql`
      select id, quantity, purpose from ammo_ledger_entry
      where user_id = ${ledger.userId} and id = ${entryId}
    `;
    expect(entries).toEqual([{ id: entryId, quantity: 25, purpose: "shooting" }]);
  } finally {
    releaseSave();
    releaseRead();
  }
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
  // 帳簿は今年の記録だけを表示するため、前年の記録は年を選んでから確認する。
  await expect(visibleEntry({ page, id: ledger.consumedEntryId })).toHaveCount(0);
  await page.getByLabel("対象年").selectOption(String(ledger.year));
  await expect(page).toHaveURL(new RegExp(`year=${ledger.year}`));
  await expect(visibleEntry({ page, id: ledger.consumedEntryId })).toBeVisible();
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
  await page.getByLabel("対象年").selectOption(String(ledger.year));
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
  await page.getByLabel("対象年").selectOption(String(ledger.year));
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

test("消費保存の通信が途切れたら先行表示を外し、入力に戻って同じ記録 ID で再保存する", async ({
  page,
  ledger,
}) => {
  await page.goto(consumePath);
  await fillConsumption({ page, ...ledger });
  await page.getByText("帳簿摘要の補足・メモ（任意）", { exact: true }).click();
  await page.getByLabel("メモ（帳簿には出ません）").fill("E2E再保存メモ");
  let rejectSave = true;
  const sentEntryIds: string[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (isConsumeSave(request)) {
      sentEntryIds.push(request.postData()?.match(/"ledgerEntryId":"([0-9a-f-]+)"/)?.[1] ?? "");
    }
    if (rejectSave && isConsumeSave(request)) {
      await route.abort("failed");
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "保存", exact: true }).click();

  const failure = page
    .getByRole("alert")
    .filter({ hasText: "消費記録（" })
    .filter({ hasText: "を保存できたか確認できませんでした" });
  await expect(failure).toBeVisible();
  await expect(failure).toContainText("二重に登録されることはありません");
  await expect(
    page.locator("[data-ledger-entry-id]:visible").filter({ hasText: "保存中" }),
  ).toHaveCount(0);
  const beforeRetry = await ledger.sql`
    select quantity from ammo_ledger_entry
    where user_id = ${ledger.userId} and category = 'consume'
  `;
  expect(beforeRetry).toEqual([{ quantity: 10 }]);

  rejectSave = false;
  await failure.getByRole("link", { name: "入力に戻る", exact: true }).click();
  await expect(page).toHaveURL(/\/consume\/new\?restore=/);
  await expect(page.getByLabel("小箱", { exact: true })).toHaveValue("1");
  await expect(page.getByLabel("銃", { exact: true })).toHaveValue(ledger.gunId);
  await expect(page.getByLabel("メモ（帳簿には出ません）")).toHaveValue("E2E再保存メモ");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page).toHaveURL(/\/ledger\?purpose=shooting&entry=[0-9a-f-]{36}$/);
  await expect(page.getByText("消費記録を保存しました", { exact: true })).toBeVisible();
  await expect(failure).toHaveCount(0);
  expect(sentEntryIds).toHaveLength(2);
  expect(sentEntryIds[1]).toBe(sentEntryIds[0]);
  const afterRetry = await ledger.sql`
    select id, quantity from ammo_ledger_entry
    where user_id = ${ledger.userId} and category = 'consume' order by quantity
  `;
  expect(afterRetry).toEqual([
    { id: ledger.consumedEntryId, quantity: 10 },
    { id: sentEntryIds[0], quantity: 25 },
  ]);
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
