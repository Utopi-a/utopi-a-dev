import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAmmoLedgerWorkspace } from "./fetch-ammo-ledger-workspace";

afterEach(() => vi.unstubAllGlobals());

describe("帳簿 GET のデータ契約", () => {
  it("日時を復元し、帳簿の日付・文字列・null は保持する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          ownerName: "テスト利用者",
          workspace: {
            entries: [
              {
                occurredOn: "2026-09-10",
                createdAt: "2026-09-10T01:23:45.000Z",
                updatedAt: "2026-09-10T02:23:45.000Z",
                voidedAt: null,
                ammoTypeName: "2026-09-10T01:23:45.000Z",
              },
            ],
          },
        }),
      ),
    );
    const payload = await fetchAmmoLedgerWorkspace();
    expect(payload.workspace.entries[0]).toEqual({
      occurredOn: "2026-09-10",
      createdAt: new Date("2026-09-10T01:23:45.000Z"),
      updatedAt: new Date("2026-09-10T02:23:45.000Z"),
      voidedAt: null,
      ammoTypeName: "2026-09-10T01:23:45.000Z",
    });
  });

  it("HTTPエラーを空の帳簿に置き換えず、再試行を案内する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    await expect(fetchAmmoLedgerWorkspace()).rejects.toThrow("再試行");
  });

  it("通信断を取得失敗として扱う", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(fetchAmmoLedgerWorkspace()).rejects.toThrow("通信状態を確認");
  });

  it("認証リダイレクトではログインを案内する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ redirected: true }));
    await expect(fetchAmmoLedgerWorkspace()).rejects.toThrow("再度ログイン");
  });
});
