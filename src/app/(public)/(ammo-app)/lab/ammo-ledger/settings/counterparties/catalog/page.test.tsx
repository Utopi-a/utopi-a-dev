import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ammoCounterparty, ammoRange } from "@/db/schema/ammo-ledger";
import { ensureCounterpartyFromCatalog } from "@/features/ammo-ledger/catalog/ensure-counterparty-from-catalog/ensure-counterparty-from-catalog";
import { listCatalogFavoriteIds } from "@/features/ammo-ledger/catalog/list-catalog-favorites/list-catalog-favorites";
import { listRecentCounterparties } from "@/features/ammo-ledger/catalog/list-recent-counterparties/list-recent-counterparties";
import { loadRangeCatalog } from "@/features/ammo-ledger/catalog/load-range-catalog/load-range-catalog";
import { removeCounterpartyFromMyList } from "@/features/ammo-ledger/catalog/remove-counterparty-from-my-list/remove-counterparty-from-my-list";
import type { CatalogEntry } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { listCounterparties } from "@/features/ammo-ledger/master/list-counterparties/list-counterparties";
import { listRanges } from "@/features/ammo-ledger/master/list-ranges/list-ranges";
import CounterpartyCatalogPage from "./page";

vi.mock("@/features/ammo-ledger/auth/require-ammo-user", () => ({
  requireAmmoUser: vi.fn(async () => ({ id: "user-1", name: "テスト利用者" })),
}));
vi.mock("@/features/ammo-ledger/master/list-counterparties/list-counterparties", () => ({
  listCounterparties: vi.fn(),
}));
vi.mock("@/features/ammo-ledger/master/list-ranges/list-ranges", () => ({
  listRanges: vi.fn(),
}));
vi.mock(
  "@/features/ammo-ledger/catalog/list-recent-counterparties/list-recent-counterparties",
  () => ({ listRecentCounterparties: vi.fn() }),
);
vi.mock("@/features/ammo-ledger/catalog/list-catalog-favorites/list-catalog-favorites", () => ({
  listCatalogFavoriteIds: vi.fn(),
}));
vi.mock(
  "@/features/ammo-ledger/catalog/ensure-counterparty-from-catalog/ensure-counterparty-from-catalog",
  () => ({ ensureCounterpartyFromCatalog: vi.fn() }),
);
vi.mock(
  "@/features/ammo-ledger/catalog/remove-counterparty-from-my-list/remove-counterparty-from-my-list",
  () => ({ removeCounterpartyFromMyList: vi.fn() }),
);
vi.mock(
  "@/features/ammo-ledger/catalog/ensure-range-from-catalog/ensure-range-from-catalog",
  () => ({
    ensureRangeFromCatalog: vi.fn(),
  }),
);
vi.mock(
  "@/features/ammo-ledger/catalog/remove-range-from-my-list/remove-range-from-my-list",
  () => ({ removeRangeFromMyList: vi.fn() }),
);
vi.mock(
  "@/features/ammo-ledger/catalog/toggle-catalog-favorite/toggle-catalog-favorite-action",
  () => ({ toggleCatalogFavoriteAction: vi.fn() }),
);

const createdAt = new Date("2026-01-01T00:00:00Z");
const [rangeInRangeMyList, rangeAsCounterparty] = loadRangeCatalog();

function buildRangeRow({ entry }: { entry: CatalogEntry }): typeof ammoRange.$inferSelect {
  return {
    id: `range-${entry.catalogId}`,
    userId: "user-1",
    catalogId: entry.catalogId,
    name: entry.name,
    address: entry.address,
    defaultPurpose: null,
    memo: null,
    createdAt,
    updatedAt: createdAt,
  };
}

function buildCounterpartyRow({
  entry,
}: {
  entry: CatalogEntry;
}): typeof ammoCounterparty.$inferSelect {
  return {
    id: `counterparty-${entry.catalogId}`,
    userId: "user-1",
    catalogId: entry.catalogId,
    name: entry.name,
    address: entry.address,
    kind: "shop",
    memo: null,
    createdAt,
    updatedAt: createdAt,
  };
}

function findCatalogRow({ entry }: { entry: CatalogEntry }) {
  const row = screen.getByText(entry.address).closest("li");
  if (!row) {
    throw new Error(`${entry.name}の行が見つかりません`);
  }
  expect(row).toHaveTextContent(entry.name);
  return row;
}

// 全国一覧の全件（約530件）を描画するため、並列実行で負荷が高いと既定の5秒を超えることがある。
describe("全国の銃砲店・射撃場一覧", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listCounterparties).mockResolvedValue([
      buildCounterpartyRow({ entry: rangeAsCounterparty }),
    ]);
    vi.mocked(listRanges).mockResolvedValue([buildRangeRow({ entry: rangeInRangeMyList })]);
    vi.mocked(listRecentCounterparties).mockResolvedValue([]);
    vi.mocked(listCatalogFavoriteIds).mockResolvedValue([]);
    vi.mocked(ensureCounterpartyFromCatalog).mockResolvedValue({ ok: true, id: "new-id" });
  });

  it("射撃場マイリストにだけある射撃場は、購入先として追加できる", async () => {
    render(await CounterpartyCatalogPage());

    const row = findCatalogRow({ entry: rangeInRangeMyList });
    fireEvent.click(within(row).getByRole("button", { name: "マイリストに追加" }));

    await waitFor(() =>
      expect(ensureCounterpartyFromCatalog).toHaveBeenCalledWith({
        catalogId: rangeInRangeMyList.catalogId,
      }),
    );
    expect(removeCounterpartyFromMyList).not.toHaveBeenCalled();
  });

  it("購入先として登録済みの射撃場は、登録済みとして表示する", async () => {
    render(await CounterpartyCatalogPage());

    const row = findCatalogRow({ entry: rangeAsCounterparty });
    expect(within(row).getByRole("button", { name: "マイリストから削除" })).toBeInTheDocument();
  });
});
