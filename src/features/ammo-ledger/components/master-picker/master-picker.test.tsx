import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MasterPickerData } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { MasterPicker } from "./master-picker";

const useMasterPickerData = vi.fn();

vi.mock("@/features/ammo-ledger/catalog/use-master-picker-data/use-master-picker-data", () => ({
  useMasterPickerData: (args: unknown) => useMasterPickerData(args),
}));

vi.mock(
  "@/features/ammo-ledger/catalog/ensure-counterparty-from-catalog/ensure-counterparty-from-catalog",
  () => ({ ensureCounterpartyFromCatalog: vi.fn() }),
);

vi.mock(
  "@/features/ammo-ledger/catalog/ensure-range-from-catalog/ensure-range-from-catalog",
  () => ({ ensureRangeFromCatalog: vi.fn() }),
);

vi.mock(
  "@/features/ammo-ledger/catalog/toggle-catalog-favorite/toggle-catalog-favorite-action",
  () => ({ toggleCatalogFavoriteAction: vi.fn() }),
);

const pickerData: MasterPickerData = {
  favorites: [],
  recent: [],
  registered: [
    {
      id: "range-original",
      name: "元の射撃場",
      address: "東京都",
      catalogId: null,
    },
  ],
  catalogByPrefecture: [],
  favoriteCatalogIds: [],
  registeredCatalogIds: [],
};

describe("MasterPicker", () => {
  it("pickerData未指定でも非空valueならデータを読み込み選択ラベルを表示する", () => {
    useMasterPickerData.mockReturnValue({
      pickerData,
      isLoading: false,
    });

    render(
      <MasterPicker
        id="range"
        label="場所"
        value="range-original"
        onChange={vi.fn()}
        catalogKind="range"
        sheetTitle="射撃場を選ぶ"
      />,
    );

    expect(useMasterPickerData).toHaveBeenCalledWith({
      catalogKind: "range",
      includeRangeCatalog: false,
      enabled: true,
    });
    expect(screen.getByText("元の射撃場")).toBeInTheDocument();
  });

  it("閉じた新規空状態ではデータを読み込まない", () => {
    useMasterPickerData.mockReturnValue({
      pickerData: undefined,
      isLoading: false,
    });

    render(
      <MasterPicker
        id="range"
        label="場所"
        value=""
        onChange={vi.fn()}
        catalogKind="range"
        sheetTitle="射撃場を選ぶ"
      />,
    );

    expect(useMasterPickerData).toHaveBeenCalledWith({
      catalogKind: "range",
      includeRangeCatalog: false,
      enabled: false,
    });
  });
});
