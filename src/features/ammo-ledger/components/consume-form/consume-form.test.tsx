import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
];

describe("ConsumeForm", () => {
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
});
