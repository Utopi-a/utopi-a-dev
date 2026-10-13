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

type FormOptions = {
  shootingStock?: Record<string, number>;
  huntingStock?: Record<string, number>;
  formAmmoTypes?: typeof ammoTypes;
  priorYearEndStockByPurpose?: Record<string, Record<string, number>>;
};

function buildForm({
  shootingStock = {},
  huntingStock = {},
  formAmmoTypes = ammoTypes,
  priorYearEndStockByPurpose = {},
}: FormOptions) {
  const snapshotsByPurpose: Record<LedgerPurpose, OpeningBalanceSnapshot> = {
    shooting: { permitCarryovers: [], stockByAmmoType: shootingStock },
    hunting: { permitCarryovers: [], stockByAmmoType: huntingStock },
    pest_control: { permitCarryovers: [], stockByAmmoType: {} },
  };
  return (
    <AmmoLedgerOptimisticNavProvider>
      <AmmoLedgerSwrProvider>
        <OpeningBalanceForm
          years={[2026]}
          initialYear={2026}
          initialPurpose="shooting"
          ammoTypes={formAmmoTypes}
          snapshotsByPurpose={snapshotsByPurpose}
          priorYearEndStockByPurpose={priorYearEndStockByPurpose}
        />
      </AmmoLedgerSwrProvider>
    </AmmoLedgerOptimisticNavProvider>
  );
}

function renderForm(options: FormOptions = {}) {
  return render(buildForm(options));
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

  it("弾種追加でサーバーから新しいpropsが届いても、保存前の入力を保持する", async () => {
    const { rerender } = renderForm({ shootingStock: { "ammo-1": 40 } });
    fireEvent.change(stockInput("12番・散弾"), { target: { value: "120" } });
    fireEvent.change(stockInput("12番・単弾"), { target: { value: "15" } });

    rerender(
      buildForm({
        shootingStock: { "ammo-1": 40 },
        formAmmoTypes: [
          ...ammoTypes,
          { id: "ammo-4", name: "20番・散弾", gaugeNumber: "9", roundsPerBox: 25 },
        ],
      }),
    );

    expect(stockInput("12番・散弾")).toHaveValue(120);
    expect(stockInput("12番・単弾")).toHaveValue(15);
    expect(stockInput("20番・散弾")).toHaveValue(null);
    fireEvent.change(stockInput("20番・散弾"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "2026年 射撃 の繰越を保存" }));

    await waitFor(() =>
      expect(saveOpeningBalanceAction).toHaveBeenCalledWith({
        year: 2026,
        purpose: "shooting",
        permitCarryovers: [],
        stockByAmmoType: { "ammo-1": 120, "ammo-2": 15, "ammo-4": 50 },
      }),
    );
  });

  it("用途を切り替えて戻っても、各用途の保存前の入力を保持する", () => {
    renderForm({ shootingStock: { "ammo-1": 40 } });
    fireEvent.change(stockInput("12番・散弾"), { target: { value: "75" } });
    fireEvent.click(screen.getByRole("button", { name: "狩猟用" }));
    expect(stockInput("12番・散弾")).toHaveValue(null);
    fireEvent.click(screen.getByRole("button", { name: "射撃用" }));
    expect(stockInput("12番・散弾")).toHaveValue(75);
  });

  it("前年末の帳簿残数を行ごとに示し、空欄で残数のある弾種だけにまとめて入れる", async () => {
    renderForm({
      shootingStock: { "ammo-2": 3 },
      priorYearEndStockByPurpose: {
        shooting: { "ammo-1": 90, "ammo-2": 25, "ammo-3": 0 },
        hunting: { "ammo-1": 50 },
      },
    });
    expect(screen.getByRole("row", { name: /12番・散弾/ })).toHaveTextContent(
      "前年末の帳簿残数 90個",
    );
    expect(screen.getByRole("row", { name: /\.308/ })).toHaveTextContent("前年末の帳簿残数 0個");
    expect(stockInput("12番・散弾")).toHaveValue(null);

    fireEvent.click(screen.getByRole("button", { name: "前年末の残数を入れる" }));

    expect(stockInput("12番・散弾")).toHaveValue(90);
    expect(stockInput("12番・単弾")).toHaveValue(3);
    expect(stockInput(".308")).toHaveValue(null);
    expect(screen.getByRole("status")).toHaveTextContent("1件の弾種に前年末の残数を入れました");
    expect(screen.getByRole("button", { name: "前年末の残数を入れる" })).toBeDisabled();
    expect(saveOpeningBalanceAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "2026年 射撃 の繰越を保存" }));
    await waitFor(() =>
      expect(saveOpeningBalanceAction).toHaveBeenCalledWith({
        year: 2026,
        purpose: "shooting",
        permitCarryovers: [],
        stockByAmmoType: { "ammo-1": 90, "ammo-2": 3 },
      }),
    );
  });

  it("前年末の記録がない用途には前年末の残数を入れるボタンを出さない", () => {
    renderForm({ priorYearEndStockByPurpose: { hunting: { "ammo-1": 50 } } });
    expect(screen.queryByRole("button", { name: "前年末の残数を入れる" })).not.toBeInTheDocument();
    expect(screen.queryByText(/前年末の帳簿残数/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "狩猟用" }));
    expect(screen.getByRole("button", { name: "前年末の残数を入れる" })).toBeEnabled();
  });
});
