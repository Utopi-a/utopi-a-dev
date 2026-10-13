import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { createAmmoTypeAction } from "@/features/ammo-ledger/master/create-ammo-type/create-ammo-type-action";
import type { OpeningBalanceSnapshot } from "@/features/ammo-ledger/opening-balance/get-opening-balance/get-opening-balance";
import { saveOpeningBalanceAction } from "@/features/ammo-ledger/opening-balance/save-opening-balance/save-opening-balance-action";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import { OpeningBalanceForm } from "./opening-balance-form";

const { push, refresh } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
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
  years?: number[];
};

function buildForm({
  shootingStock = {},
  huntingStock = {},
  formAmmoTypes = ammoTypes,
  priorYearEndStockByPurpose = {},
  years = [2026],
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
          years={years}
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

const openingBalancePath = "/lab/ammo-ledger/settings/opening-balance";

function currentPath() {
  return `${window.location.pathname}${window.location.search}`;
}

describe("OpeningBalanceForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveOpeningBalanceAction).mockResolvedValue({ ok: true });
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    window.history.replaceState(null, "", openingBalancePath);
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

  it("他の用途に保存していない入力があれば、保存後も帳簿へ移らずその用途を知らせる", async () => {
    renderForm();
    fireEvent.change(stockInput("12番・散弾"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "狩猟用" }));
    fireEvent.change(stockInput("12番・単弾"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "2026年 狩猟 の繰越を保存" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "狩猟用の繰越を保存しました。射撃用の入力がまだ保存されていません。",
    );
    expect(saveOpeningBalanceAction).toHaveBeenCalledWith({
      year: 2026,
      purpose: "hunting",
      permitCarryovers: [],
      stockByAmmoType: { "ammo-2": 10 },
    });
    expect(currentPath()).toBe(openingBalancePath);
    expect(refresh).toHaveBeenCalled();

    // 保存した狩猟用の入力は、再取得前でも未保存として扱わない。
    fireEvent.click(screen.getByRole("button", { name: "射撃用" }));
    expect(stockInput("12番・散弾")).toHaveValue(40);
    fireEvent.click(screen.getByRole("button", { name: "2026年 射撃 の繰越を保存" }));
    await waitFor(() => expect(currentPath()).toBe("/lab/ammo-ledger/ledger?purpose=shooting"));
  });

  it("他の用途の入力を元の値に戻していれば、保存後に帳簿へ移る", async () => {
    renderForm({ huntingStock: { "ammo-1": 20 } });
    fireEvent.click(screen.getByRole("button", { name: "狩猟用" }));
    fireEvent.change(stockInput("12番・散弾"), { target: { value: "25" } });
    fireEvent.change(stockInput("12番・散弾"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "射撃用" }));
    fireEvent.click(screen.getByRole("button", { name: "2026年 射撃 の繰越を保存" }));

    await waitFor(() => expect(currentPath()).toBe("/lab/ammo-ledger/ledger?purpose=shooting"));
    expect(screen.queryByText(/まだ保存されていません/)).not.toBeInTheDocument();
  });

  it("年を切り替えても表示中の用途を保ち、保存していない入力が消えることを示す", () => {
    renderForm({ years: [2026, 2025] });
    fireEvent.click(screen.getByRole("button", { name: "狩猟用" }));
    expect(screen.queryByText(/保存していない入力は消えます/)).not.toBeInTheDocument();
    fireEvent.change(stockInput("12番・散弾"), { target: { value: "5" } });
    expect(screen.getByText("年を切り替えると、保存していない入力は消えます。")).toBeVisible();

    fireEvent.change(screen.getByLabelText("対象年"), { target: { value: "2025" } });
    expect(push).toHaveBeenCalledWith(`${openingBalancePath}?year=2025&purpose=hunting`);
  });

  it("残数欄は弾種名で読み上げる", () => {
    renderForm();
    expect(screen.getByRole("spinbutton", { name: ".308の繰越残数" })).toHaveValue(null);
  });

  it("弾種追加欄で Enter を押すと弾種を追加し、繰越は保存しない", async () => {
    vi.mocked(createAmmoTypeAction).mockResolvedValue({ ok: true } as Awaited<
      ReturnType<typeof createAmmoTypeAction>
    >);
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "弾種を追加" }));
    fireEvent.keyDown(screen.getByLabelText("1箱あたり発数"), { key: "Enter" });

    await waitFor(() => expect(createAmmoTypeAction).toHaveBeenCalledTimes(1));
    expect(saveOpeningBalanceAction).not.toHaveBeenCalled();
    expect(currentPath()).toBe(openingBalancePath);
  });
});
