import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import { BulkEntryForm } from "./bulk-entry-form";

const { retry } = vi.hoisted(() => ({ retry: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/lab/ammo-ledger/bulk/new",
}));
vi.mock("@/features/ammo-ledger/catalog/use-master-picker-data/use-master-picker-data", () => ({
  useMasterPickerData: () => ({
    pickerData: undefined,
    isLoading: false,
    error: new Error("一覧を取得できませんでした。再試行してください。"),
    retry,
  }),
}));
vi.mock("@/features/ammo-ledger/components/master-picker/master-picker", () => ({
  MasterPicker: () => null,
}));
vi.mock(
  "@/features/ammo-ledger/transactions/create-bulk-transactions/create-bulk-transactions-action",
  () => ({ createBulkTransactionsAction: vi.fn() }),
);

describe("BulkEntryForm", () => {
  it("購入先の一覧を取得できなくても入力を始められ、再試行できる", () => {
    render(
      <AmmoLedgerOptimisticNavProvider>
        <AmmoLedgerSwrProvider>
          <BulkEntryForm guns={[]} ammoTypes={[]} stockByAmmoTypeId={{}} />
        </AmmoLedgerSwrProvider>
      </AmmoLedgerOptimisticNavProvider>,
    );

    expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("譲受の相手方は手入力になります");
    expect(screen.getAllByLabelText("小箱").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
