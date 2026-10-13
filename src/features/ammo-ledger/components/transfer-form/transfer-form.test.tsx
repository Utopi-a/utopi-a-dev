import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import {
  buildTestEntry,
  buildTestWorkspace,
  testAmmoType,
} from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { TransferForm } from "./transfer-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/lab/ammo-ledger/inflow/new",
  useSearchParams: () => new URLSearchParams(),
}));

const { useMasterPickerDataMock } = vi.hoisted(() => ({
  useMasterPickerDataMock: vi.fn((): { pickerData?: unknown; error?: unknown } => ({
    pickerData: undefined,
  })),
}));

vi.mock(
  "@/features/ammo-ledger/catalog/use-master-picker-data/use-master-picker-data",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/features/ammo-ledger/catalog/use-master-picker-data/use-master-picker-data")
    >()),
    useMasterPickerData: () => useMasterPickerDataMock(),
  }),
);

vi.mock("@/features/ammo-ledger/components/master-picker/master-picker", () => ({
  MasterPicker: ({ value }: { value: string }) => <div>選択中の譲渡先: {value || "未選択"}</div>,
}));

vi.mock("@/features/ammo-ledger/transactions/create-transaction/create-transaction-action", () => ({
  createTransactionAction: vi.fn(),
}));

vi.mock("@/features/ammo-ledger/transactions/update-transaction/update-transaction-action", () => ({
  updateTransactionAction: vi.fn(),
}));

const pickerData = {
  favorites: [],
  recent: [{ id: "gun-shop", name: "いつもの銃砲店", address: "東京都", catalogId: null }],
  registered: [],
  catalogByPrefecture: [],
  favoriteCatalogIds: [],
  registeredCatalogIds: [],
};

const workspacePayload = {
  ownerName: "テスト利用者",
  workspace: buildTestWorkspace({
    entries: [
      buildTestEntry({
        id: "shooting-carryover",
        category: "carryover",
        occurredOn: "2026-01-01",
        quantity: 200,
      }),
    ],
  }),
};

function TransferFormWithWorkspace() {
  return (
    <AmmoLedgerOptimisticNavProvider>
      <AmmoLedgerSwrProvider initialWorkspace={workspacePayload}>
        <TransferForm
          ammoTypes={[testAmmoType]}
          stockByAmmoTypeId={{}}
          initialValues={{ occurredOn: "2026-08-01" }}
        />
      </AmmoLedgerSwrProvider>
    </AmmoLedgerOptimisticNavProvider>
  );
}

describe("TransferForm", () => {
  beforeEach(() => {
    useMasterPickerDataMock.mockReturnValue({ pickerData: undefined });
  });

  it("一覧の読み込み中に手入力欄を出さず、届いても最近の購入先を譲渡先にしない", () => {
    const { rerender } = render(<TransferFormWithWorkspace />);
    expect(screen.getByText("選択中の譲渡先: 未選択")).toBeInTheDocument();
    expect(screen.queryByLabelText("相手方氏名")).not.toBeInTheDocument();

    useMasterPickerDataMock.mockReturnValue({ pickerData });
    rerender(<TransferFormWithWorkspace />);

    expect(screen.getByText("選択中の譲渡先: 未選択")).toBeInTheDocument();
  });

  it("一覧を取得できなければ、手入力で譲渡先を入力できる", () => {
    useMasterPickerDataMock.mockReturnValue({ pickerData: undefined, error: new Error("失敗") });
    render(<TransferFormWithWorkspace />);

    expect(screen.getByLabelText("相手方氏名")).toBeInTheDocument();
  });

  it("選んだ用途の残数と、譲渡した後の残数を表示する", () => {
    render(<TransferFormWithWorkspace />);

    fireEvent.change(screen.getByLabelText("弾"), { target: { value: testAmmoType.id } });
    fireEvent.change(screen.getByLabelText("小箱"), { target: { value: "2" } });

    expect(screen.getByText("射撃用の残200個 → 記録後 150個")).toBeInTheDocument();
  });
});
