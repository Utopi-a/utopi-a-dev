import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import type { AmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-payload/ammo-ledger-workspace-payload";
import { buildTestWorkspace } from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { AmmoLedgerHomeView } from "./ammo-ledger-home-view";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/lab/ammo-ledger",
}));

const profile = {
  userId: "user-1",
  ownerName: "架空 太郎",
  ownerFurigana: null,
  possessionPermitCertificateNumber: null,
  ownerAddress: "架空県架空市1-1",
  ownerBirthDate: null,
  ownerPhone: null,
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function renderHome({ initialWorkspace }: { initialWorkspace?: AmmoLedgerWorkspacePayload }) {
  return render(
    <AmmoLedgerOptimisticNavProvider>
      <AmmoLedgerSwrProvider initialWorkspace={initialWorkspace}>
        <AmmoLedgerHomeView />
      </AmmoLedgerSwrProvider>
    </AmmoLedgerOptimisticNavProvider>,
  );
}

function expectRecordTilesUsable() {
  expect(screen.getByRole("link", { name: /消費した/ })).toBeVisible();
  expect(screen.getByRole("link", { name: /譲り受けた/ })).toBeVisible();
}

describe("AmmoLedgerHomeView のセットアップ手順", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    // PWA の案内が表示モードを調べるため、jsdom にない matchMedia を補う。
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("何も登録していない人には、番号付きの手順を出してプロフィールを次の手順にする", () => {
    renderHome({
      initialWorkspace: {
        ownerName: "架空 太郎",
        workspace: buildTestWorkspace({ guns: [], inventoryItems: [] }),
      },
    });

    const guide = screen.getByRole("region", { name: "はじめに登録してください" });
    const steps = within(guide).getAllByRole("link");
    expect(steps.map((step) => step.getAttribute("href"))).toEqual([
      "/lab/ammo-ledger/settings/profile",
      "/lab/ammo-ledger/settings/guns",
      "/lab/ammo-ledger/settings/ammo-types",
      "/lab/ammo-ledger/settings/permits",
      "/lab/ammo-ledger/settings/opening-balance",
    ]);
    expect(steps[0]).toHaveAttribute("aria-current", "step");
    expect(steps[0]).toHaveTextContent("必須");
    expect(steps[3]).toHaveTextContent("推奨");
    expect(steps[4]).toHaveTextContent("任意");
    expect(steps.slice(1).every((step) => !step.hasAttribute("aria-current"))).toBe(true);
    expectRecordTilesUsable();
  });

  it("済んだ項目は登録済みにし、次に残っている必須項目を強調する", () => {
    renderHome({
      initialWorkspace: {
        ownerName: "架空 太郎",
        workspace: buildTestWorkspace({ profile, guns: [] }),
      },
    });

    const guide = screen.getByRole("region", { name: "はじめに登録してください" });
    const [profileStep, gunStep, ammoTypeStep] = within(guide).getAllByRole("link");
    expect(profileStep).toHaveTextContent("登録済み");
    expect(ammoTypeStep).toHaveTextContent("登録済み");
    expect(gunStep).toHaveAttribute("aria-current", "step");
    expect(gunStep).toHaveTextContent("登録する →");
  });

  it("必須の登録がすべて済んでいれば、許可や繰越が未登録でも手順を出さない", () => {
    renderHome({
      initialWorkspace: { ownerName: "架空 太郎", workspace: buildTestWorkspace({ profile }) },
    });

    expect(screen.queryByRole("region", { name: "はじめに登録してください" })).toBeNull();
    expectRecordTilesUsable();
  });

  it("帳簿データの読み込み中は手順を出さず、記録の入力タイルを使える", async () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));
    renderHome({});
    await act(async () => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("region", { name: "はじめに登録してください" })).toBeNull();
    expectRecordTilesUsable();
  });

  it("帳簿データを取得できなくても、記録の入力タイルの表示を妨げない", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    renderHome({});
    await act(async () => {});

    expect(screen.queryByRole("region", { name: "はじめに登録してください" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expectRecordTilesUsable();
  });
});
