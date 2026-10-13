import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testGun } from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import GunsSettingsPage from "./page";

const { listGunsMock } = vi.hoisted(() => ({ listGunsMock: vi.fn() }));

vi.mock("@/features/ammo-ledger/auth/require-ammo-user", () => ({
  requireAmmoUser: async () => ({ id: "user-1", name: "架空 太郎" }),
}));
vi.mock("@/features/ammo-ledger/master/list-guns/list-guns", () => ({
  listGuns: listGunsMock,
}));
vi.mock("@/features/ammo-ledger/components/gun-form/gun-form", () => ({
  GunForm: () => <p>銃の追加フォーム</p>,
}));
vi.mock("@/features/ammo-ledger/components/gun-row-actions/gun-row-actions", () => ({
  GunRowActions: () => null,
}));

async function renderPage({ returnTo }: { returnTo?: string }) {
  render(await GunsSettingsPage({ searchParams: Promise.resolve({ returnTo }) }));
}

describe("銃の設定ページの戻りリンク", () => {
  beforeEach(() => {
    listGunsMock.mockReset();
  });

  it("記録画面から来て銃が1件以上あれば、記録の入力に戻るリンクを出す", async () => {
    listGunsMock.mockResolvedValue([testGun]);
    await renderPage({ returnTo: "/lab/ammo-ledger/consume/new" });

    expect(screen.getByRole("link", { name: "記録の入力に戻る" })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/consume/new",
    );
  });

  it("まだ銃がなければ戻りリンクを出さない", async () => {
    listGunsMock.mockResolvedValue([]);
    await renderPage({ returnTo: "/lab/ammo-ledger/consume/new" });

    expect(screen.queryByRole("link", { name: "記録の入力に戻る" })).toBeNull();
  });

  it("帳簿アプリ外の戻り先は使わない", async () => {
    listGunsMock.mockResolvedValue([testGun]);
    await renderPage({ returnTo: "https://evil.example/lab/ammo-ledger/consume/new" });

    expect(screen.queryByRole("link", { name: "記録の入力に戻る" })).toBeNull();
  });
});
