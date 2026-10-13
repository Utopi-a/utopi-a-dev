import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import {
  testAmmoType,
  testGun,
} from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
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

  it("行ごとの数量欄を、それぞれのラベルで操作できる", () => {
    render(
      <AmmoLedgerOptimisticNavProvider>
        <AmmoLedgerSwrProvider>
          <BulkEntryForm guns={[]} ammoTypes={[]} stockByAmmoTypeId={{}} />
        </AmmoLedgerSwrProvider>
      </AmmoLedgerOptimisticNavProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ 消費を追加" }));
    const [firstRow, secondRow] = screen.getAllByRole("article");
    fireEvent.change(within(secondRow).getByLabelText("小箱"), { target: { value: "3" } });

    expect(within(firstRow).getByLabelText("小箱")).toHaveValue(null);
    expect(within(secondRow).getByLabelText("小箱")).toHaveValue(3);
  });

  it("最初の行は前回の消費、追加した行は直前の行の銃・弾・用途で始める", () => {
    render(
      <AmmoLedgerOptimisticNavProvider>
        <AmmoLedgerSwrProvider>
          <BulkEntryForm
            guns={[testGun]}
            ammoTypes={[testAmmoType]}
            stockByAmmoTypeId={{}}
            firstRowCarryOver={{ gunId: testGun.id, ammoTypeId: testAmmoType.id }}
          />
        </AmmoLedgerSwrProvider>
      </AmmoLedgerOptimisticNavProvider>,
    );

    const [firstRow] = screen.getAllByRole("article");
    expect(within(firstRow).getByLabelText("弾")).toHaveValue(testAmmoType.id);
    fireEvent.change(within(firstRow).getByLabelText("用途区分"), {
      target: { value: "hunting" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ 消費を追加" }));

    const secondRow = screen.getAllByRole("article")[1];
    expect(within(secondRow).getByLabelText("銃")).toHaveValue(testGun.id);
    expect(within(secondRow).getByLabelText("弾")).toHaveValue(testAmmoType.id);
    expect(within(secondRow).getByLabelText("用途区分")).toHaveValue("hunting");
  });
});
