import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import {
  buildTestEntry,
  buildTestWorkspace,
} from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { InventoryView } from "./inventory-view";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock("@/features/ammo-ledger/transactions/create-draft/create-draft-action", () => ({
  createDraftFromDiffAction: vi.fn(),
}));

const workspace = buildTestWorkspace({
  entries: [
    buildTestEntry({
      id: "shooting",
      category: "carryover",
      occurredOn: "2026-01-01",
      quantity: 100,
    }),
    buildTestEntry({
      id: "hunting",
      category: "carryover",
      purpose: "hunting",
      occurredOn: "2026-01-01",
      quantity: 50,
    }),
    buildTestEntry({
      id: "deleted-type",
      category: "acquire",
      occurredOn: "2026-02-01",
      quantity: 25,
      ammoTypeId: null,
      ammoTypeName: "削除した弾種",
    }),
  ],
});

function renderInventoryView() {
  window.history.replaceState(null, "", "/lab/ammo-ledger/inventory");
  return render(
    <AmmoLedgerSwrProvider initialWorkspace={{ ownerName: "テスト利用者", workspace }}>
      <AmmoLedgerOptimisticNavProvider>
        <InventoryView />
      </AmmoLedgerOptimisticNavProvider>
    </AmmoLedgerSwrProvider>,
  );
}

function ammoTypeRow() {
  return screen.getByRole("row", { name: /テスト散弾 7.5号/ });
}

describe("InventoryView", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("用途で見ると、その用途の帳簿の残数を出す", () => {
    renderInventoryView();
    expect(within(ammoTypeRow()).getByText("150個")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "用途" }));
    fireEvent.click(screen.getByRole("button", { name: "狩猟用" }));

    // 既定用途が射撃の弾種でも、狩猟の帳簿に残数があれば狩猟の残数を出す。
    expect(within(ammoTypeRow()).getByText("50個")).toBeInTheDocument();
    expect(screen.getByText(/表示中の合計/)).toHaveTextContent("表示中の合計: 50個");
  });

  it("残数のない号数グループは出さない", () => {
    renderInventoryView();

    expect(screen.getByText("7.5号", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText("9号・9.5号")).not.toBeInTheDocument();
  });

  it("弾種からその用途の帳簿へ移れる", () => {
    renderInventoryView();

    fireEvent.click(within(ammoTypeRow()).getByRole("link", { name: "テスト散弾 7.5号" }));

    expect(`${window.location.pathname}${window.location.search}`).toBe(
      "/lab/ammo-ledger/ledger?purpose=shooting",
    );
  });

  it("弾種の登録がない記録の件数を示し、弾種分類の確認へ案内する", () => {
    renderInventoryView();

    expect(screen.getByText(/弾種が登録されていない記録が1件あり/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "弾種分類の確認 →" })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/settings/ammo-types/review",
    );
  });
});

describe("InventoryView の登録不足の案内", () => {
  function renderInventory({ workspace }: { workspace: AmmoLedgerWorkspace }) {
    window.history.replaceState(null, "", "/lab/ammo-ledger/inventory");
    return render(
      <AmmoLedgerSwrProvider initialWorkspace={{ ownerName: "架空 太郎", workspace }}>
        <AmmoLedgerOptimisticNavProvider>
          <InventoryView />
        </AmmoLedgerOptimisticNavProvider>
      </AmmoLedgerSwrProvider>,
    );
  }

  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("弾種がなければ、残弾の一覧と照合の代わりに弾種の登録へ案内する", () => {
    renderInventory({ workspace: buildTestWorkspace({ inventoryItems: [] }) });

    expect(screen.getByText("残弾を確認するには、弾種の登録が必要です。")).toBeVisible();
    expect(screen.getByRole("link", { name: "弾種を登録する" })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/settings/ammo-types?returnTo=%2Flab%2Fammo-ledger%2Finventory",
    );
    expect(screen.queryByRole("heading", { name: "実在庫との照合" })).toBeNull();
  });

  it("弾種があれば残弾の一覧と照合を出す", () => {
    renderInventory({ workspace: buildTestWorkspace() });

    expect(screen.getByText("実在庫との照合")).toBeVisible();
    expect(screen.queryByRole("link", { name: "弾種を登録する" })).toBeNull();
  });
});
