import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerActionRateLimitError } from "@/features/ammo-ledger/auth/server-action-rate-limit/server-action-rate-limit-error";
import { loadAmmoLedgerWorkspacePayloadForSession } from "@/features/ammo-ledger/workspace/load-ammo-ledger-workspace-payload/load-ammo-ledger-workspace-payload";
import { GET } from "./route";

vi.mock(
  "@/features/ammo-ledger/workspace/load-ammo-ledger-workspace-payload/load-ammo-ledger-workspace-payload",
  () => ({ loadAmmoLedgerWorkspacePayloadForSession: vi.fn() }),
);

describe("GET /api/ammo-ledger/workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("読み込みのレート制限に当たったら 429 と日本語のエラーを返す", async () => {
    vi.mocked(loadAmmoLedgerWorkspacePayloadForSession).mockRejectedValue(
      new ServerActionRateLimitError(),
    );

    const response = await GET();

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "操作が多すぎます。しばらくしてからお試しください。",
    });
  });

  it("レート制限以外の例外はそのまま投げる", async () => {
    vi.mocked(loadAmmoLedgerWorkspacePayloadForSession).mockRejectedValue(new Error("db down"));

    await expect(GET()).rejects.toThrow("db down");
  });
});
