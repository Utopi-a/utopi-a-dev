import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AcquireForm } from "./acquire-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/features/ammo-ledger/catalog/use-master-picker-data/use-master-picker-data", () => ({
  useMasterPickerData: () => ({ pickerData: undefined }),
}));

vi.mock("@/features/ammo-ledger/components/field-select", () => ({
  FieldSelect: ({
    id,
    label,
    value,
    onChange,
    options,
  }: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <label htmlFor={id}>
      {label}
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">選択</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

vi.mock("@/features/ammo-ledger/components/master-picker/master-picker", () => ({
  MasterPicker: () => null,
}));

vi.mock("@/features/ammo-ledger/components/packaging-fields/packaging-fields", () => ({
  PackagingFields: () => null,
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

const huntingAmmoType = {
  id: "ammo-hunting",
  userId: "user-1",
  name: "12番 散弾 7.5号",
  caliber: "12番",
  cartridgeType: "shotgun_shot",
  classificationConfirmedAt: new Date("2026-01-01T00:00:00Z"),
  gaugeNumber: "7.5号",
  roundsPerBox: 25,
  defaultPurpose: "hunting",
  memo: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

const permits = [
  {
    id: "permit-hunting",
    userId: "user-1",
    ledgerPurpose: "hunting",
    name: "12番",
    permitPurpose: "狩猟",
    grantedOn: "2026-01-01",
    expiresOn: "2026-02-15",
    quantity: 250,
    memo: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  },
  {
    id: "permit-shooting",
    userId: "user-1",
    ledgerPurpose: "shooting",
    name: "12番",
    permitPurpose: "射撃",
    grantedOn: "2026-01-01",
    expiresOn: "2026-12-15",
    quantity: 4500,
    memo: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  },
];

describe("AcquireForm", () => {
  it("弾種の既定用途に有効な許可がなければ警告し、射撃用へ直すと警告を消す", () => {
    render(
      <AcquireForm
        ammoTypes={[huntingAmmoType]}
        permits={permits}
        initialValues={{ occurredOn: "2026-08-08" }}
      />,
    );

    fireEvent.change(screen.getByLabelText("弾"), { target: { value: "ammo-hunting" } });

    expect(screen.getByLabelText("用途区分")).toHaveValue("hunting");
    expect(
      screen.getByText(
        "この譲受日に有効な狩猟用の譲受許可がありません。用途または許可期間を確認してください。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("用途区分"), { target: { value: "shooting" } });

    expect(screen.queryByText(/この譲受日に有効な狩猟用/)).not.toBeInTheDocument();
  });
});
