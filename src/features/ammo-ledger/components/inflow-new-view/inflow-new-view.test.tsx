import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import { buildTestWorkspace } from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { InflowNewView } from "./inflow-new-view";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock(
  "@/features/ammo-ledger/transactions/get-draft/use-draft-transaction/use-draft-transaction",
  () => ({
    useDraftTransaction: () => ({
      draft: null,
      isLoading: false,
      error: undefined,
      retry: vi.fn(),
    }),
  }),
);

// 各フォームの入力は個別のテストで確かめるため、ここではどの画面を出したかだけを見る。
vi.mock("@/features/ammo-ledger/components/acquire-form/acquire-form", () => ({
  AcquireForm: () => <p>譲受フォーム</p>,
}));
vi.mock("@/features/ammo-ledger/components/dispose-form/dispose-form", () => ({
  DisposeForm: () => <p>廃棄フォーム</p>,
}));
vi.mock("@/features/ammo-ledger/components/transfer-form/transfer-form", () => ({
  TransferForm: () => <p>譲渡フォーム</p>,
}));
vi.mock("@/features/ammo-ledger/components/manufacture-form/manufacture-form", () => ({
  ManufactureForm: () => <p>製造フォーム</p>,
}));
vi.mock("@/features/ammo-ledger/components/issue-form/issue-form", () => ({
  IssueForm: () => <p>交付フォーム</p>,
}));
vi.mock("@/features/ammo-ledger/components/receive-form/receive-form", () => ({
  ReceiveForm: () => <p>被交付フォーム</p>,
}));

const permit = {
  id: "permit-1",
  userId: "user-1",
  ledgerPurpose: "shooting",
  name: "許可1",
  permitPurpose: "標的射撃",
  grantedOn: "2026-01-10",
  expiresOn: "2027-01-09",
  quantity: 500,
  memo: null,
  createdAt: new Date("2026-01-10T00:00:00Z"),
  updatedAt: new Date("2026-01-10T00:00:00Z"),
};

function renderInflow({ workspace }: { workspace: AmmoLedgerWorkspace }) {
  return render(
    <AmmoLedgerSwrProvider initialWorkspace={{ ownerName: "架空 太郎", workspace }}>
      <InflowNewView />
    </AmmoLedgerSwrProvider>,
  );
}

const permitHref = "/lab/ammo-ledger/settings/permits?returnTo=%2Flab%2Fammo-ledger%2Finflow%2Fnew";

describe("InflowNewView の登録不足の案内", () => {
  it("弾種も許可もなければ、両方の登録へ案内してフォームを出さない", () => {
    renderInflow({ workspace: buildTestWorkspace({ inventoryItems: [] }) });

    expect(
      screen.getByText("譲り受けを記録するには、弾種と譲受許可の登録が必要です。"),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "弾種を登録する" })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/settings/ammo-types?returnTo=%2Flab%2Fammo-ledger%2Finflow%2Fnew",
    );
    expect(screen.getByRole("link", { name: "譲受許可を登録する" })).toHaveAttribute(
      "href",
      permitHref,
    );
    expect(screen.queryByText("譲受フォーム")).toBeNull();
  });

  it("弾種があり許可がなければ、譲受タブで許可の登録へ案内し、廃棄などは入力できる", () => {
    renderInflow({ workspace: buildTestWorkspace() });

    expect(screen.getByText("譲り受けを記録するには、譲受許可の登録が必要です。")).toBeVisible();
    expect(screen.getByRole("link", { name: "譲受許可を登録する" })).toHaveAttribute(
      "href",
      permitHref,
    );
    expect(screen.queryByText("譲受フォーム")).toBeNull();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "廃棄" }));
    fireEvent.click(screen.getByRole("tab", { name: "廃棄" }));
    expect(screen.getByText("廃棄フォーム")).toBeVisible();
  });

  it("許可があれば譲受フォームを出し、登録の案内は出さない", () => {
    renderInflow({ workspace: buildTestWorkspace({ permits: [permit] }) });

    expect(screen.getByText("譲受フォーム")).toBeVisible();
    expect(screen.queryByRole("link", { name: /を登録する/ })).toBeNull();
  });
});
