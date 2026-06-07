import { expect, test } from "@playwright/test";

const publicPages = [
  { path: "/", heading: "ゆーとぴあ" },
  { path: "/about", heading: "プロフィール" },
  { path: "/work", heading: "制作物" },
  { path: "/blog", heading: "ブログ" },
  { path: "/lab", heading: "実験" },
] as const;

for (const { path, heading } of publicPages) {
  test(`公開ページ ${path} が表示される`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
  });
}

test("ヘッダーから About へ遷移できる", async ({ page, isMobile }) => {
  await page.goto("/");

  if (isMobile) {
    await page.getByRole("button", { name: "メニューを開く" }).click();
    await page.getByRole("navigation", { name: "モバイル" }).getByRole("link", { name: "About" }).click();
  } else {
    await page.getByRole("navigation", { name: "メイン" }).getByRole("link", { name: "About" }).click();
  }

  await expect(page).toHaveURL("/about");
  await expect(page.getByRole("heading", { name: "プロフィール", level: 1 })).toBeVisible();
});
