import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { consumePath, expect, test } from "./fixtures";

test("workspace GETは認証を要求し、別利用者の帳簿を返さずキャッシュを禁止する", async ({
  page,
  request,
  ledger,
  baseURL,
}) => {
  const endpoint = "/api/ammo-ledger/workspace";
  const authenticated = await page.request.get(endpoint);
  expect(authenticated.status()).toBe(200);
  expect(authenticated.headers()["cache-control"]).toContain("no-store");
  const own = (await authenticated.json()) as { workspace: { entries: { id: string }[] } };
  expect(own.workspace.entries.map((entry) => entry.id).sort()).toEqual(
    [ledger.shootingCarryoverId, ledger.huntingCarryoverId, ledger.consumedEntryId].sort(),
  );

  const anonymous = await request.get(endpoint, { maxRedirects: 0 });
  expect([301, 302, 303, 307, 308, 401, 403]).toContain(anonymous.status());
  const anonymousBody = await anonymous.text();
  expect(anonymousBody).not.toContain(ledger.userId);
  expect(anonymousBody).not.toContain(ledger.consumedEntryId);

  let otherUserId: string | undefined;
  try {
    const suffix = randomUUID();
    const signUp = await request.post("/api/auth/sign-up/email", {
      headers: {
        origin: baseURL as string,
        "x-forwarded-for": `127.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`,
      },
      data: {
        email: `ammo-other-e2e-${suffix}@example.invalid`,
        password: randomBytes(24).toString("base64url"),
        name: "帳簿E2E 別の架空利用者",
      },
    });
    expect(signUp.status(), await signUp.text()).toBe(200);
    otherUserId = ((await signUp.json()) as { user: { id: string } }).user.id;

    const other = await request.get(`${endpoint}?userId=${ledger.userId}`);
    expect(other.status()).toBe(200);
    expect(other.headers()["cache-control"]).toContain("no-store");
    const payload = (await other.json()) as { workspace: { entries: unknown[] } };
    expect(payload.workspace.entries).toEqual([]);
    expect(JSON.stringify(payload)).not.toContain(ledger.consumedEntryId);
  } finally {
    if (otherUserId) {
      await ledger.sql`delete from "user" where id = ${otherUserId}`;
    }
  }
});

test("実Service Workerが帳簿のGETをCacheStorageへ保存せず、オフラインで古い帳簿を返さない", async ({
  browser,
  page,
  ledger,
  baseURL,
  isMobile,
  viewport,
  deviceScaleFactor,
  hasTouch,
  userAgent,
}) => {
  const context = await browser.newContext({
    baseURL,
    isMobile,
    viewport,
    deviceScaleFactor,
    hasTouch,
    userAgent,
    storageState: await page.context().storageState(),
    serviceWorkers: "allow",
  });
  try {
    const pwaPage = await context.newPage();
    await pwaPage.goto(consumePath);
    await expect(pwaPage.getByRole("heading", { name: "消費した", exact: true })).toBeVisible();
    await expect
      .poll(() => pwaPage.evaluate(() => Boolean(navigator.serviceWorker.controller)), {
        timeout: 15_000,
      })
      .toBe(true);
    const result = await pwaPage.evaluate(async () => {
      const response = await fetch("/api/ammo-ledger/workspace");
      const payload = (await response.json()) as { workspace: { entries: { id: string }[] } };
      return {
        status: response.status,
        entryIds: payload.workspace.entries.map((entry) => entry.id),
      };
    });
    expect(result.status).toBe(200);
    expect(result.entryIds).toContain(ledger.consumedEntryId);
    await pwaPage.getByRole("button", { name: "場所", exact: true }).click();
    await expect(pwaPage.getByRole("button", { name: /E2E架空射撃場/ }).first()).toBeVisible();
    const cachedPrivateUrls = await pwaPage.evaluate(
      async ({ userId, entryId }) => {
        const urls: { path: string; containsUserData: boolean }[] = [];
        for (const cacheName of await caches.keys()) {
          const cache = await caches.open(cacheName);
          for (const cachedRequest of await cache.keys()) {
            const url = new URL(cachedRequest.url);
            if (
              url.pathname.startsWith("/api/ammo-ledger/") ||
              (url.pathname.startsWith("/lab/ammo-ledger") &&
                url.pathname !== "/lab/ammo-ledger/~offline")
            ) {
              const content = await (await cache.match(cachedRequest))?.text();
              urls.push({
                path: url.pathname,
                containsUserData: Boolean(content?.includes(userId) || content?.includes(entryId)),
              });
            }
          }
        }
        return urls;
      },
      { userId: ledger.userId, entryId: ledger.consumedEntryId },
    );
    expect(cachedPrivateUrls).toEqual([]);

    await context.setOffline(true);
    const offlineResult = await pwaPage.evaluate(async () => {
      try {
        const response = await fetch("/api/ammo-ledger/workspace");
        return response.ok ? "cached-success" : "unavailable";
      } catch {
        return "unavailable";
      }
    });
    expect(offlineResult).toBe("unavailable");
  } finally {
    await context.close();
  }
});
