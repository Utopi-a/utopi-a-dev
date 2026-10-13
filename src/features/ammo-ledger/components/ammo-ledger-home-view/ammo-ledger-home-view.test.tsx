import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import type { AmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-payload/ammo-ledger-workspace-payload";
import {
  buildTestEntry,
  buildTestWorkspace,
} from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
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

describe("AmmoLedgerHomeView の状況サマリ", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const permitCreatedAt = new Date("2026-01-01T00:00:00Z");
  const permit = {
    id: "permit-1",
    userId: "user-1",
    ledgerPurpose: "shooting",
    name: "12番",
    permitPurpose: "標的射撃",
    grantedOn: "2026-01-10",
    expiresOn: "2026-11-01",
    quantity: 500,
    memo: null,
    createdAt: permitCreatedAt,
    updatedAt: permitCreatedAt,
  };
  const permitEvents = [
    { kind: "grant", occurredOn: permit.grantedOn, quantity: permit.quantity },
    { kind: "expiry", occurredOn: permit.expiresOn, quantity: 0 },
  ].map(({ kind, occurredOn, quantity }) => ({
    id: `${permit.id}-${kind}`,
    userId: "user-1",
    permitId: permit.id,
    purpose: "shooting",
    eventKind: kind,
    occurredOn,
    quantity,
    memo: null,
    createdAt: permitCreatedAt,
    updatedAt: permitCreatedAt,
  }));

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    // 期限までの日数を固定するため、日付だけを固定する。
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-13T03:00:00Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("帳簿残数・用途ごとの許可の残り・確定済みの日付と注意事項を、該当画面へのリンクで出す", () => {
    renderHome({
      initialWorkspace: {
        ownerName: "架空 太郎",
        workspace: buildTestWorkspace({
          profile,
          permits: [permit],
          permitEvents,
          entries: [
            buildTestEntry({
              id: "carryover-1",
              category: "carryover",
              occurredOn: "2026-01-01",
              quantity: 100,
            }),
          ],
          lockState: { isLocked: true, lockedThrough: "2025-12-31" },
        }),
      },
    });

    const status = screen.getByRole("region", { name: "いまの状況" });
    expect(
      within(status).getByRole("link", { name: /帳簿残数（全用途）\s*100個/ }),
    ).toHaveAttribute("href", "/lab/ammo-ledger/inventory");
    expect(
      within(status).getByRole("link", {
        name: /今日使える許可の残り（射撃）\s*500個\s*最も近い期限: あと19日/,
      }),
    ).toHaveAttribute("href", "/lab/ammo-ledger/ledger?purpose=shooting");
    expect(
      within(status).getByRole("link", { name: /帳簿の確定\s*2025\/12\/31まで/ }),
    ).toHaveAttribute("href", "/lab/ammo-ledger/ledger");
    const notices = within(status).getByRole("list", { name: "注意事項" });
    expect(within(notices).getByRole("link")).toHaveTextContent(
      "射撃用の譲受許可（12番）は有効期限まであと19日です。残り500個。",
    );
  });

  it("読み込み中は状況のスケルトンを出す", async () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));
    renderHome({});
    await act(async () => {});

    expect(screen.getByRole("status", { name: "状況を読み込み中" })).toBeVisible();
    expectRecordTilesUsable();
  });

  it("状況を取得できなければ知らせ、再試行で取得し直す", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    renderHome({});

    expect(await screen.findByText("状況を読み込めませんでした。")).toBeVisible();
    const callsBeforeRetry = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));
    await act(async () => {});

    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
    expectRecordTilesUsable();
  });

  it("ホーム画面への追加の案内は、記録を入力の下・状況の上に出す", async () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    );
    renderHome({
      initialWorkspace: { ownerName: "架空 太郎", workspace: buildTestWorkspace({ profile }) },
    });

    const banner = await screen.findByRole("region", { name: "アプリのインストール" });
    const lastRecordTile = screen.getByRole("link", { name: /まとめて追加/ });
    const status = screen.getByRole("region", { name: "いまの状況" });
    expect(lastRecordTile.compareDocumentPosition(banner)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(banner.compareDocumentPosition(status)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
