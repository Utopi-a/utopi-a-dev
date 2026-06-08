import { describe, expect, it } from "vitest";
import { resolveShellRoute } from "@/features/ammo-ledger/workspace/resolve-shell-route/resolve-shell-route";
import { workspaceStaleMs } from "@/features/ammo-ledger/workspace/workspace-stale-ms/workspace-stale-ms";

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
