import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { ServerActionRateLimitError } from "@/features/ammo-ledger/auth/server-action-rate-limit/server-action-rate-limit-error";
import { loadAmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/load-ammo-ledger-workspace-payload/load-ammo-ledger-workspace-payload";
import { loadInitialAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/load-initial-ammo-ledger-workspace/load-initial-ammo-ledger-workspace";
import { resolveShellRoute } from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";
import { workspaceStaleMs } from "@/features/ammo-ledger/workspace/workspace-stale-ms/workspace-stale-ms";

vi.mock("@/features/ammo-ledger/auth/require-ammo-user", () => ({
  requireAmmoUser: vi.fn(),
}));
vi.mock(
  "@/features/ammo-ledger/workspace/load-ammo-ledger-workspace-payload/load-ammo-ledger-workspace-payload",
  () => ({ loadAmmoLedgerWorkspacePayload: vi.fn() }),
);

describe("loadInitialAmmoLedgerWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("読み込みのレート制限に当たったら初期データなしで続ける", async () => {
    vi.mocked(requireAmmoUser).mockRejectedValue(new ServerActionRateLimitError());

    await expect(
      loadInitialAmmoLedgerWorkspace({ pathname: "/lab/ammo-ledger/ledger" }),
    ).resolves.toBeUndefined();
    expect(loadAmmoLedgerWorkspacePayload).not.toHaveBeenCalled();
  });

  it("レート制限以外の例外（ログイン画面へのリダイレクトなど）はそのまま投げる", async () => {
    vi.mocked(requireAmmoUser).mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(
      loadInitialAmmoLedgerWorkspace({ pathname: "/lab/ammo-ledger/ledger" }),
    ).rejects.toThrow("NEXT_REDIRECT");
  });
});

describe("resolveShellRoute", () => {
  it("shell ルートを判定する", () => {
    expect(resolveShellRoute({ path: "/lab/ammo-ledger" })).toBe("home");
    expect(resolveShellRoute({ path: "/lab/ammo-ledger/ledger" })).toBe("ledger");
    expect(resolveShellRoute({ path: "/lab/ammo-ledger/inventory" })).toBe("inventory");
    expect(resolveShellRoute({ path: "/lab/ammo-ledger/settings" })).toBe("settings-hub");
  });

  it("フォームページは shell ルートではない", () => {
    expect(resolveShellRoute({ path: "/lab/ammo-ledger/consume/new" })).toBeNull();
    expect(resolveShellRoute({ path: "/lab/ammo-ledger/bulk/new" })).toBeNull();
  });
});

describe("workspaceStaleMs", () => {
  it("30 秒の stale ウィンドウ", () => {
    expect(workspaceStaleMs).toBe(30_000);
  });
});
