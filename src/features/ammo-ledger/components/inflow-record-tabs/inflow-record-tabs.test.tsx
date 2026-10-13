import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { DisposeForm } from "@/features/ammo-ledger/components/dispose-form/dispose-form";
import { ManufactureForm } from "@/features/ammo-ledger/components/manufacture-form/manufacture-form";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import { InflowRecordTabs } from "./inflow-record-tabs";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/lab/ammo-ledger/inflow/new",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/ammo-ledger/transactions/create-transaction/create-transaction-action", () => ({
  createTransactionAction: vi.fn(),
}));
vi.mock("@/features/ammo-ledger/transactions/update-transaction/update-transaction-action", () => ({
  updateTransactionAction: vi.fn(),
}));

function Memo({ label }: { label: string }) {
  return <input aria-label={label} defaultValue="" />;
}

function selectTab(name: string) {
  const tab = screen.getByRole("tab", { name });
  fireEvent.mouseDown(tab);
  fireEvent.click(tab);
}

describe("InflowRecordTabs", () => {
  it("タブを切り替えて戻っても入力途中の値を保持し、URL の他の指定を消さない", () => {
    window.history.replaceState(null, "", "/lab/ammo-ledger/inflow/new?restore=change-1");
    render(
      <InflowRecordTabs
        defaultTab="acquire"
        acquireContent={<Memo label="譲受の入力" />}
        disposeContent={<Memo label="廃棄の入力" />}
        transferContent={<Memo label="譲渡の入力" />}
        manufactureContent={<Memo label="製造の入力" />}
        issueContent={<Memo label="交付の入力" />}
        receiveContent={<Memo label="被交付の入力" />}
      />,
    );
    fireEvent.change(screen.getByLabelText("譲受の入力"), { target: { value: "50発" } });

    selectTab("廃棄");
    expect(screen.getByLabelText("廃棄の入力")).toBeVisible();
    expect(screen.getByLabelText("譲受の入力")).not.toBeVisible();

    expect(new URL(window.location.href).searchParams.get("restore")).toBe("change-1");
    expect(new URL(window.location.href).searchParams.get("tab")).toBe("dispose");

    selectTab("譲受");
    expect(screen.getByLabelText("譲受の入力")).toHaveValue("50発");
  });

  it("全タブのフォームを保持しても入力欄の id が重複せず、ラベルが表示中のタブの入力欄を指す", () => {
    const ammoTypes = [
      {
        id: "ammo-1",
        userId: "user-1",
        name: "テスト弾",
        caliber: "12番",
        cartridgeType: "shotgun_shot",
        classificationConfirmedAt: null,
        gaugeNumber: "7.5",
        roundsPerBox: 25,
        defaultPurpose: "shooting",
        memo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const { container } = render(
      <AmmoLedgerOptimisticNavProvider>
        <AmmoLedgerSwrProvider>
          <InflowRecordTabs
            defaultTab="dispose"
            acquireContent={<Memo label="譲受の入力" />}
            disposeContent={<DisposeForm ammoTypes={ammoTypes} stockByAmmoTypeId={{}} />}
            transferContent={<Memo label="譲渡の入力" />}
            manufactureContent={<ManufactureForm ammoTypes={ammoTypes} stockByAmmoTypeId={{}} />}
            issueContent={<Memo label="交付の入力" />}
            receiveContent={<Memo label="被交付の入力" />}
          />
        </AmmoLedgerSwrProvider>
      </AmmoLedgerOptimisticNavProvider>,
    );

    const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    const visibleSmallBoxes = screen
      .getAllByLabelText("小箱")
      .filter((element) => !element.closest("[hidden]"));
    expect(visibleSmallBoxes).toHaveLength(1);
    expect(screen.getByRole("tabpanel", { name: "廃棄" })).toContainElement(visibleSmallBoxes[0]);
  });
});
