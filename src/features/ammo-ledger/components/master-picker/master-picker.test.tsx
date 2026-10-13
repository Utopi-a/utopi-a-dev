import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { unauthenticatedMutationResult } from "@/features/ammo-ledger/auth/unauthenticated-mutation-result/unauthenticated-mutation-result";
import { ensureCounterpartyFromCatalog } from "@/features/ammo-ledger/catalog/ensure-counterparty-from-catalog/ensure-counterparty-from-catalog";
import type { MasterPickerData } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { MasterPicker } from "./master-picker";

const useMasterPickerData = vi.fn();

vi.mock("@/features/ammo-ledger/catalog/use-master-picker-data/use-master-picker-data", () => ({
  useMasterPickerData: (args: unknown) => useMasterPickerData(args),
  useInvalidateMasterPickerData: () => vi.fn(),
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

const counterpartyPickerData: MasterPickerData = {
  favorites: [
    {
      catalogId: "gun-shop-new",
      name: "新しい銃砲店",
      address: "東京都千代田区",
      prefecture: "東京都",
      location: "千代田区",
      phone: null,
      catalogSource: "gun_shop",
    },
  ],
  recent: [],
  registered: [
    {
      id: "counterparty-original",
      name: "元の購入先",
      address: "東京都",
      catalogId: null,
    },
  ],
  catalogByPrefecture: [],
  favoriteCatalogIds: ["gun-shop-new"],
  registeredCatalogIds: [],
  counterpartyIdByCatalogId: {},
};

type EnsureResult = Awaited<ReturnType<typeof ensureCounterpartyFromCatalog>>;

function deferredEnsure() {
  let resolve: (result: EnsureResult) => void = () => {};
  const promise = new Promise<EnsureResult>((onResolve) => {
    resolve = onResolve;
  });
  vi.mocked(ensureCounterpartyFromCatalog).mockReturnValueOnce(promise);
  return { resolve };
}

function CounterpartyForm({ onSubmit }: { onSubmit: (counterpartyId: string) => void }) {
  const [counterpartyId, setCounterpartyId] = useState("counterparty-original");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(counterpartyId);
      }}
    >
      <MasterPicker
        id="counterparty"
        label="購入先"
        value={counterpartyId}
        onChange={setCounterpartyId}
        catalogKind="gun_shop"
        sheetTitle="購入先を選ぶ"
        required
      />
      <button type="submit">保存</button>
    </form>
  );
}

describe("MasterPicker の全国一覧からの登録", () => {
  async function selectNewGunShop() {
    useMasterPickerData.mockReturnValue({ pickerData: counterpartyPickerData, isLoading: false });
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<CounterpartyForm onSubmit={onSubmit} />);

    const trigger = screen.getByRole("button", { name: "購入先" });
    expect(trigger).toHaveAccessibleDescription("元の購入先");
    await user.click(trigger);
    expect(screen.getByRole("button", { name: "閉じる" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新しい銃砲店をお気に入り" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: /^新しい銃砲店\s*千代田区$/ }));
    return { onSubmit, user, trigger };
  }

  it("登録が終わるまでは登録中と示し、旧い相手方のまま保存させない", async () => {
    const ensure = deferredEnsure();
    const { onSubmit, user, trigger } = await selectNewGunShop();

    expect(trigger).toHaveAccessibleDescription("新しい銃砲店を登録中…");
    expect(trigger).toHaveAttribute("aria-busy", "true");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => ensure.resolve({ ok: true, id: "counterparty-new" }));

    expect(trigger).toHaveAccessibleDescription("新しい銃砲店");
    expect(trigger).toHaveAttribute("aria-busy", "false");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSubmit).toHaveBeenCalledWith("counterparty-new");
  });

  it("登録に失敗したら元の選択に戻してエラーを示す", async () => {
    const ensure = deferredEnsure();
    const { onSubmit, user, trigger } = await selectNewGunShop();

    await act(async () => ensure.resolve(unauthenticatedMutationResult()));

    expect(screen.getByRole("alert")).toHaveTextContent("ログインの有効期限が切れました");
    expect(trigger).toHaveAccessibleDescription("元の購入先");
    expect(trigger).toHaveAttribute("aria-busy", "false");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onSubmit).toHaveBeenCalledWith("counterparty-original");
  });
});
