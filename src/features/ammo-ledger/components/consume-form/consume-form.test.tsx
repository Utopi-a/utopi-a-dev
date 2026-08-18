import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateTransactionAction } from "@/features/ammo-ledger/transactions/update-transaction/update-transaction-action";
import { ConsumeForm } from "./consume-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/features/ammo-ledger/components/master-picker/master-picker", () => ({
  MasterPicker: ({ value }: { value: string }) => <div>選択中の場所: {value}</div>,
}));

vi.mock("@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast", () => ({
  showAmmoLedgerToast: vi.fn(),
}));

vi.mock("@/features/ammo-ledger/transactions/create-transaction/create-transaction-action", () => ({
  createTransactionAction: vi.fn(),
}));

vi.mock("@/features/ammo-ledger/transactions/update-transaction/update-transaction-action", () => ({
  updateTransactionAction: vi.fn(),
}));

vi.mock(
  "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace",
  () => ({ useInvalidateAmmoLedgerWorkspace: () => vi.fn() }),
);

const createdAt = new Date("2026-01-01T00:00:00Z");

const guns = [
  {
    id: "gun-682",
    userId: "user-1",
    name: "682",
    gunNumber: "682",
    permitNumber: "permit-682",
    gunType: "shotgun",
    caliber: "12番",
    purpose: null,
    memo: null,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "gun-original",
    userId: "user-1",
    name: "元記録の銃",
    gunNumber: "999",
    permitNumber: "permit-999",
    gunType: "shotgun",
    caliber: "12番",
    purpose: null,
    memo: null,
    createdAt,
    updatedAt: createdAt,
  },
];

const ammoTypes = [
  {
    id: "ammo-original",
    userId: "user-1",
    name: "元記録の弾",
    caliber: "12番",
    cartridgeType: "shotgun_shot",
    classificationConfirmedAt: createdAt,
    gaugeNumber: "7.5号",
    roundsPerBox: 25,
    defaultPurpose: "shooting",
    memo: null,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "ammo-hunting",
    userId: "user-1",
    name: "狩猟用の弾",
    caliber: "12番",
    cartridgeType: "shotgun_shot",
    classificationConfirmedAt: createdAt,
    gaugeNumber: "5号",
    roundsPerBox: 25,
    defaultPurpose: "hunting",
    memo: null,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "ammo-hunting-2",
    userId: "user-1",
    name: "別の狩猟用の弾",
    caliber: "12番",
    cartridgeType: "shotgun_shot",
    classificationConfirmedAt: createdAt,
    gaugeNumber: "6号",
    roundsPerBox: 25,
    defaultPurpose: "hunting",
    memo: null,
    createdAt,
    updatedAt: createdAt,
  },
];

describe("ConsumeForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateTransactionAction).mockResolvedValue({
      ok: false,
      error: "テストでは保存しない",
    });
  });

  it("編集画面で元記録の銃・用途・射撃場・弾種・数量・注記を初期表示する", () => {
    render(
      <ConsumeForm
        guns={guns}
        ammoTypes={ammoTypes}
        stockByAmmoTypeId={{ "ammo-original": 100, "ammo-hunting": 100 }}
        ledgerEntryId="ledger-entry-1"
        initialValues={{
          occurredOn: "2026-08-01",
          purpose: "shooting",
          ammoTypeId: "ammo-original",
          gunId: "gun-original",
          rangeId: "range-original",
          outerBoxCount: 1,
          boxCount: 2,
          looseRounds: 3,
          memo: "元のメモ",
          ledgerNote: "元の帳簿摘要",
        }}
      />,
    );

    expect(screen.getByLabelText("銃")).toHaveValue("gun-original");
    expect(screen.getByLabelText("用途区分")).toHaveValue("shooting");
    expect(screen.getByText("選択中の場所: range-original")).toBeInTheDocument();
    expect(screen.getByLabelText("弾")).toHaveValue("ammo-original");
    expect(screen.getByLabelText("大箱")).toHaveValue(1);
    expect(screen.getByLabelText("小箱")).toHaveValue(2);
    expect(screen.getByLabelText("バラ（±）")).toHaveValue(3);
    expect(screen.getByLabelText("メモ（帳簿には出ません）")).toHaveValue("元のメモ");
    expect(screen.getByLabelText("帳簿摘要の補足（任意）")).toHaveValue("元の帳簿摘要");
  });

  it("編集画面で弾種を変更しても元の用途と場所を保持する", () => {
    render(
      <ConsumeForm
        guns={guns}
        ammoTypes={ammoTypes}
        stockByAmmoTypeId={{ "ammo-original": 100, "ammo-hunting": 100 }}
        ledgerEntryId="ledger-entry-1"
        initialValues={{
          purpose: "shooting",
          ammoTypeId: "ammo-original",
          gunId: "gun-original",
          rangeId: "range-original",
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("弾"), { target: { value: "ammo-hunting" } });

    expect(screen.getByLabelText("用途区分")).toHaveValue("shooting");
    expect(screen.getByText("選択中の場所: range-original")).toBeInTheDocument();
  });

  it("新規作成では弾種の既定用途を自動適用する", () => {
    render(
      <ConsumeForm guns={guns} ammoTypes={ammoTypes} stockByAmmoTypeId={{ "ammo-hunting": 100 }} />,
    );

    fireEvent.change(screen.getByLabelText("弾"), { target: { value: "ammo-hunting" } });

    expect(screen.getByLabelText("用途区分")).toHaveValue("hunting");
  });

  it("狩猟用の弾種を変更しても選択済みの射撃場を保持する", () => {
    render(
      <ConsumeForm
        guns={guns}
        ammoTypes={ammoTypes}
        stockByAmmoTypeId={{ "ammo-hunting": 100, "ammo-hunting-2": 100 }}
        initialValues={{
          purpose: "hunting",
          ammoTypeId: "ammo-hunting",
          gunId: "gun-original",
          rangeId: "range-original",
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("弾"), {
      target: { value: "ammo-hunting-2" },
    });

    expect(screen.getByLabelText("消費場所")).toHaveValue("range");
    expect(screen.getByText("選択中の場所: range-original")).toBeInTheDocument();
  });

  it("編集画面で狩猟場所を初期表示する", () => {
    render(
      <ConsumeForm
        guns={guns}
        ammoTypes={ammoTypes}
        stockByAmmoTypeId={{ "ammo-hunting": 100 }}
        ledgerEntryId="ledger-entry-2"
        initialValues={{
          purpose: "hunting",
          ammoTypeId: "ammo-hunting",
          gunId: "gun-original",
          location: "元の狩猟場所",
        }}
      />,
    );

    expect(screen.getByLabelText("場所")).toHaveValue("元の狩猟場所");
  });

  it("狩猟用の弾でも射撃場を消費場所として初期表示する", () => {
    render(
      <ConsumeForm
        guns={guns}
        ammoTypes={ammoTypes}
        stockByAmmoTypeId={{ "ammo-hunting": 100 }}
        ledgerEntryId="ledger-entry-3"
        initialValues={{
          purpose: "hunting",
          ammoTypeId: "ammo-hunting",
          gunId: "gun-original",
          rangeId: "range-original",
        }}
      />,
    );

    expect(screen.getByLabelText("消費場所")).toHaveValue("range");
    expect(screen.getByText("選択中の場所: range-original")).toBeInTheDocument();
  });

  it("狩猟用の弾を射撃場で消費する更新入力を送る", async () => {
    render(
      <ConsumeForm
        guns={guns}
        ammoTypes={ammoTypes}
        stockByAmmoTypeId={{ "ammo-hunting": 100 }}
        ledgerEntryId="ledger-entry-3"
        initialValues={{
          occurredOn: "2026-08-18",
          purpose: "hunting",
          ammoTypeId: "ammo-hunting",
          gunId: "gun-original",
          rangeId: "range-original",
          looseRounds: 1,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "更新" }));

    await waitFor(() =>
      expect(updateTransactionAction).toHaveBeenCalledWith(
        expect.objectContaining({
          ledgerEntryId: "ledger-entry-3",
          inputKind: "consume",
          purpose: "hunting",
          rangeId: "range-original",
        }),
      ),
    );
    expect(updateTransactionAction).toHaveBeenCalledWith(
      expect.not.objectContaining({ location: expect.anything() }),
    );
  });
});
