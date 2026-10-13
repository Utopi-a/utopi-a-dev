import { describe, expect, it } from "vitest";
import { buildPathWithReturnTo, resolveReturnToPath } from "./resolve-return-to-path";

describe("resolveReturnToPath", () => {
  it.each([
    ["/lab/ammo-ledger/consume/new", "/lab/ammo-ledger/consume/new"],
    ["/lab/ammo-ledger/inflow/new?tab=acquire", "/lab/ammo-ledger/inflow/new?tab=acquire"],
    ["/lab/ammo-ledger/inventory#stock", "/lab/ammo-ledger/inventory"],
  ])("帳簿アプリ内のパス %s を受け付ける", (value, expected) => {
    expect(resolveReturnToPath({ value })).toBe(expected);
  });

  it.each([
    ["外部サイトの絶対 URL", "https://evil.example/lab/ammo-ledger/consume/new"],
    ["プロトコル相対 URL", "//evil.example/lab/ammo-ledger/consume/new"],
    ["javascript: URL", "javascript:alert(1)//lab/ammo-ledger/"],
    ["アプリ外へ抜ける相対パス", "/lab/ammo-ledger/../../admin"],
    ["エンコードした相対パス", "/lab/ammo-ledger/%2e%2e/%2e%2e/admin"],
    ["バックスラッシュを含むパス", "/lab/ammo-ledger/\\evil.example"],
    ["前方一致だけする別パス", "/lab/ammo-ledgerx/consume/new"],
    ["帳簿アプリ外のパス", "/blog"],
    ["空文字", ""],
  ])("%s は受け付けない", (_, value) => {
    expect(resolveReturnToPath({ value })).toBeNull();
  });

  it("指定なしや同じパラメータの重複は受け付けない", () => {
    expect(resolveReturnToPath({ value: undefined })).toBeNull();
    expect(resolveReturnToPath({ value: null })).toBeNull();
    expect(
      resolveReturnToPath({ value: ["/lab/ammo-ledger/consume/new", "https://evil.example"] }),
    ).toBeNull();
  });
});

describe("buildPathWithReturnTo", () => {
  it("戻り先をエンコードして付け、resolveReturnToPath で元のパスに戻せる", () => {
    const href = buildPathWithReturnTo({
      path: "/lab/ammo-ledger/settings/guns",
      returnTo: "/lab/ammo-ledger/inflow/new?tab=acquire",
    });

    expect(href).toBe(
      "/lab/ammo-ledger/settings/guns?returnTo=%2Flab%2Fammo-ledger%2Finflow%2Fnew%3Ftab%3Dacquire",
    );
    const returnTo = new URL(href, "https://example.test").searchParams.get("returnTo");
    expect(resolveReturnToPath({ value: returnTo })).toBe(
      "/lab/ammo-ledger/inflow/new?tab=acquire",
    );
  });
});
