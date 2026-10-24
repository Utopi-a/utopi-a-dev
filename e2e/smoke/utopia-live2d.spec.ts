import { expect, test } from "@playwright/test";

test("ゆーとぴあちゃんの Live2D モデルが動き出し、表情を切り替えられる", async ({ page }) => {
  await page.goto("/lab/utopia");
  await expect(page.getByRole("heading", { name: "ゆーとぴあちゃん", level: 1 })).toBeVisible();

  // 読み込み中の静止画が消え、Live2D のキャンバスが出たら描き始めている
  await expect(page.getByRole("img", { name: "ゆーとぴあちゃん" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('img[src*="poster"]')).toHaveCount(0);

  const smile = page.getByRole("button", { name: "微笑み" });
  await smile.click();
  await expect(smile).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "通常" })).toHaveAttribute("aria-pressed", "false");
});

test("Lab の一覧からゆーとぴあちゃんのページへ行ける", async ({ page }) => {
  await page.goto("/lab");
  await page.getByRole("link", { name: /ゆーとぴあちゃん/ }).click();
  await expect(page).toHaveURL("/lab/utopia");
});
