import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import type { OpeningBalanceSnapshot } from "@/features/ammo-ledger/opening-balance/get-opening-balance/get-opening-balance";
import { saveOpeningBalanceAction } from "@/features/ammo-ledger/opening-balance/save-opening-balance/save-opening-balance-action";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import { OpeningBalanceForm } from "./opening-balance-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/lab/ammo-ledger/settings/opening-balance",
}));
vi.mock(
  "@/features/ammo-ledger/opening-balance/save-opening-balance/save-opening-balance-action",
  () => ({ saveOpeningBalanceAction: vi.fn() }),
);
vi.mock("@/features/ammo-ledger/master/create-ammo-type/create-ammo-type-action", () => ({
  createAmmoTypeAction: vi.fn(),
}));

const ammoTypes = [
  { id: "ammo-1", name: "12番・散弾", gaugeNumber: "7.5", roundsPerBox: 25 },
  { id: "ammo-2", name: "12番・単弾", gaugeNumber: null, roundsPerBox: 5 },
  { id: "ammo-3", name: ".308", gaugeNumber: null, roundsPerBox: 20 },
];

function renderForm({
  shootingStock = {},
  huntingStock = {},
}: {
  shootingStock?: Record<string, number>;
  huntingStock?: Record<string, number>;
} = {}) {
  const snapshotsByPurpose: Record<LedgerPurpose, OpeningBalanceSnapshot> = {
    shooting: { permitCarryovers: [], stockByAmmoType: shootingStock },
    hunting: { permitCarryovers: [], stockByAmmoType: huntingStock },
    pest_control: { permitCarryovers: [], stockByAmmoType: {} },
  };
  return render(
    <AmmoLedgerOptimisticNavProvider>
      <AmmoLedgerSwrProvider>
        <OpeningBalanceForm
          years={[2026]}
          initialYear={2026}
          initialPurpose="shooting"
          ammoTypes={ammoTypes}
          snapshotsByPurpose={snapshotsByPurpose}
        />
      </AmmoLedgerSwrProvider>
    </AmmoLedgerOptimisticNavProvider>,
  );
}

function stockInput(name: string) {
  return within(screen.getByRole("row", { name: new RegExp(name) })).getByRole("spinbutton");
}

describe("OpeningBalanceForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveOpeningBalanceAction).mockResolvedValue({ ok: true });
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("空欄の弾種を省略し、明示した0と正の残数を保存する", async () => {
    renderForm();
    fireEvent.change(stockInput("12番・散弾"), { target: { value: "0" } });
    fireEvent.change(stockInput("12番・単弾"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "2026年 射撃 の繰越を保存" }));

    await waitFor(() =>
      expect(saveOpeningBalanceAction).toHaveBeenCalledWith({
        year: 2026,
        purpose: "shooting",
        permitCarryovers: [],
        stockByAmmoType: { "ammo-1": 0, "ammo-2": 25 },
      }),
    );
  });

  it("再取得した0を表示し、既存の繰越を空欄にすると送信から除外する", async () => {
    renderForm({ shootingStock: { "ammo-1": 0, "ammo-2": 25 } });
    expect(stockInput("12番・散弾")).toHaveValue(0);
    expect(stockInput(".308")).toHaveValue(null);
    fireEvent.change(stockInput("12番・単弾"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "2026年 射撃 の繰越を保存" }));

    await waitFor(() =>
      expect(saveOpeningBalanceAction).toHaveBeenCalledWith({
        year: 2026,
        purpose: "shooting",
        permitCarryovers: [],
        stockByAmmoType: { "ammo-1": 0 },
      }),
    );
  });

  it("用途を切り替えると選択した用途の繰越だけを送信する", async () => {
    renderForm({ shootingStock: { "ammo-1": 40 }, huntingStock: { "ammo-2": 0 } });
    fireEvent.click(screen.getByRole("button", { name: "狩猟用" }));
    expect(stockInput("12番・散弾")).toHaveValue(null);
    expect(stockInput("12番・単弾")).toHaveValue(0);
    fireEvent.click(screen.getByRole("button", { name: "2026年 狩猟 の繰越を保存" }));

    await waitFor(() =>
      expect(saveOpeningBalanceAction).toHaveBeenCalledWith({
        year: 2026,
        purpose: "hunting",
        permitCarryovers: [],
        stockByAmmoType: { "ammo-2": 0 },
      }),
    );
  });
});
