import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lockLedgerAction } from "@/features/ammo-ledger/ledger/lock/lock-ledger-action/lock-ledger-action";
import {
  PendingLedgerChangesProvider,
  usePendingLedgerChanges,
} from "@/features/ammo-ledger/workspace/pending-ledger-changes/pending-ledger-changes";
import { LedgerPrintControls } from "./ledger-print-controls";

const { push, refresh, navigation } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  navigation: { search: "" },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));
vi.mock("@/features/ammo-ledger/ledger/lock/lock-ledger-action/lock-ledger-action", () => ({
  lockLedgerAction: vi.fn(),
}));

const previewProps = {
  years: [2025, 2026],
  selectedYear: 2026,
  lockedThrough: null,
  isTargetLocked: false,
  canPrintOfficially: false,
  isPreview: true,
  targetDate: "2026-09-01",
  entryCount: 3,
  lockIssues: [],
};

function openConfirmation() {
  fireEvent.click(screen.getByRole("button", { name: "2026/09/01まで確定して印刷" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "上記を理解し、確定します" }));
  fireEvent.click(screen.getByRole("button", { name: "確定して印刷" }));
}

describe("LedgerPrintControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.search = "";
    window.history.replaceState(null, "", "/lab/ammo-ledger/ledger/print?year=2026&preview=1");
    vi.spyOn(window, "print").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("確定の確認で対象日とできなくなる操作を示し、開き直すと確認をやり直す", () => {
    render(<LedgerPrintControls {...previewProps} />);
    fireEvent.click(screen.getByRole("button", { name: "2026/09/01まで確定して印刷" }));

    const dialog = screen.getByRole("dialog", { name: "帳簿を確定して印刷" });
    expect(dialog).toHaveTextContent("2026年の記録（3件）を2026/09/01まで確定します。");
    expect(dialog).toHaveTextContent(
      "確定すると、2026/09/01までの記録の追加・編集・取消・並べ替えができなくなります。",
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "上記を理解し、確定します" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    fireEvent.click(screen.getByRole("button", { name: "2026/09/01まで確定して印刷" }));

    expect(screen.getByRole("checkbox", { name: "上記を理解し、確定します" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "確定して印刷" })).toBeDisabled();
    expect(lockLedgerAction).not.toHaveBeenCalled();
  });

  it("確定通信に失敗してもエラーを表示し、再操作できる", async () => {
    vi.mocked(lockLedgerAction).mockRejectedValueOnce(new Error("network unavailable"));
    render(<LedgerPrintControls {...previewProps} />);
    openConfirmation();

    expect(await screen.findByText(/帳簿の確定結果を確認できませんでした/)).toBeVisible();
    expect(await screen.findByRole("button", { name: "確定して印刷" })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
    expect(window.print).not.toHaveBeenCalled();
  });

  it("検証エラーでは未確定のまま印刷を開始しない", async () => {
    vi.mocked(lockLedgerAction).mockResolvedValueOnce({ ok: false, error: "弾種分類が未確認です" });
    render(<LedgerPrintControls {...previewProps} />);
    openConfirmation();

    expect(await screen.findByText("弾種分類が未確認です")).toBeVisible();
    expect(push).not.toHaveBeenCalled();
    expect(window.print).not.toHaveBeenCalled();
  });

  it("確定成功後は正式帳票の更新を待って一度だけ印刷する", async () => {
    vi.mocked(lockLedgerAction).mockResolvedValueOnce({
      ok: true,
      lockState: { isLocked: true, lockedThrough: "2026-09-01" },
    });
    const view = render(<LedgerPrintControls {...previewProps} />);
    openConfirmation();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(window.print).not.toHaveBeenCalled();

    const officialProps = {
      ...previewProps,
      isTargetLocked: true,
      canPrintOfficially: true,
      isPreview: false,
    };
    view.rerender(<LedgerPrintControls {...officialProps} />);
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
    view.rerender(<LedgerPrintControls {...officialProps} />);
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it("正式な文書のフォント準備を待って一度だけ自動印刷する", async () => {
    navigation.search = "print=1";
    let resolveFonts: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      resolveFonts = resolve;
    });
    const fonts = Object.getOwnPropertyDescriptor(document, "fonts");
    Object.defineProperty(document, "fonts", { configurable: true, value: { ready } });
    try {
      const props = {
        ...previewProps,
        isTargetLocked: true,
        canPrintOfficially: true,
        isPreview: false,
      };
      const view = render(<LedgerPrintControls {...props} />);
      expect(window.print).not.toHaveBeenCalled();
      await act(async () => resolveFonts());
      await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
      view.rerender(<LedgerPrintControls {...props} />);
      expect(window.print).toHaveBeenCalledTimes(1);
    } finally {
      if (fonts) Object.defineProperty(document, "fonts", fonts);
      else Reflect.deleteProperty(document, "fonts");
    }
  });

  it("同じ年を解除して再確定した場合も更新された帳票を一度だけ印刷する", async () => {
    vi.mocked(lockLedgerAction).mockResolvedValue({
      ok: true,
      lockState: { isLocked: true, lockedThrough: "2026-09-01" },
    });
    const view = render(<LedgerPrintControls {...previewProps} />);
    openConfirmation();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const officialProps = {
      ...previewProps,
      isTargetLocked: true,
      canPrintOfficially: true,
      isPreview: false,
    };
    view.rerender(<LedgerPrintControls {...officialProps} />);
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));

    view.rerender(<LedgerPrintControls {...previewProps} />);
    openConfirmation();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(window.print).toHaveBeenCalledTimes(1);
    view.rerender(<LedgerPrintControls {...officialProps} />);
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(2));
    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("未確定プレビューや検証エラーがある帳簿は自動印刷しない", async () => {
    navigation.search = "print=1";
    const view = render(<LedgerPrintControls {...previewProps} />);
    await act(async () => {});
    expect(window.print).not.toHaveBeenCalled();
    view.rerender(
      <LedgerPrintControls
        {...previewProps}
        isTargetLocked
        lockIssues={[
          {
            kind: "negative_type_balance",
            purpose: "shooting",
            entryId: "entry-1",
            occurredOn: "2026-09-01",
            message: "12番・散弾の種類別残が-25個になります",
            href: "/lab/ammo-ledger/ledger?purpose=shooting&entry=entry-1",
          },
        ]}
      />,
    );
    await act(async () => {});
    expect(window.print).not.toHaveBeenCalled();
  });

  it("保存待ちの変更がある間は自動印刷せず、保存後に帳票を取り直してから一度だけ印刷する", async () => {
    navigation.search = "year=2026&print=1";
    let finishSaving = () => {};
    function SavingChange() {
      const { begin, remove } = usePendingLedgerChanges();
      return (
        <button
          type="button"
          onClick={() => {
            begin({
              id: "saving-void",
              marksEntriesSaving: false,
              summary: "取消",
              overlay: { upserted: [], removedIds: ["entry-1"] },
            });
            finishSaving = () => remove({ id: "saving-void" });
          }}
        >
          保存待ちを作る
        </button>
      );
    }
    const officialProps = {
      ...previewProps,
      isTargetLocked: true,
      lockedThrough: "2026-09-01",
      canPrintOfficially: true,
      isPreview: false,
    };
    render(
      <PendingLedgerChangesProvider>
        <SavingChange />
        <LedgerPrintControls {...officialProps} />
      </PendingLedgerChangesProvider>,
    );
    // 初回描画で始まる自動印刷より先に保存待ちを作るため、同期的に操作する。
    fireEvent.click(screen.getByRole("button", { name: "保存待ちを作る" }));
    vi.mocked(window.print).mockClear();

    await act(async () => {});
    expect(window.print).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "印刷" })).toBeDisabled();

    await act(async () => finishSaving());
    expect(refresh).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
  });

  it("確定前の問題を用途ごとにまとめ、直す画面へリンクする", () => {
    render(
      <LedgerPrintControls
        {...previewProps}
        selectedYear={2027}
        targetDate="2027-03-01"
        lockIssues={[
          {
            kind: "unconfirmed_classification",
            purpose: null,
            entryId: null,
            occurredOn: "2027-03-01",
            message: "未確認の弾種が1件あります",
            href: "/lab/ammo-ledger/settings/ammo-types/review",
          },
          {
            kind: "missing_carryover",
            purpose: "hunting",
            entryId: null,
            occurredOn: "2027-01-01",
            message: "2027年の年初繰越が未登録です（前年末の帳簿残数 50個）",
            href: "/lab/ammo-ledger/settings/opening-balance?year=2027&purpose=hunting",
          },
          {
            kind: "negative_total_balance",
            purpose: "hunting",
            entryId: "entry-1",
            occurredOn: "2027-02-01",
            message: "総残数が-25個になります",
            href: "/lab/ammo-ledger/ledger?purpose=hunting&entry=entry-1",
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "2027/03/01まで確定して印刷" })).toBeDisabled();
    const hunting = screen.getByRole("region", { name: "狩猟用の問題" });
    expect(within(hunting).getByRole("heading")).toHaveTextContent("狩猟用（2件）");
    expect(
      within(hunting).getByRole("link", {
        name: "2027年の年初繰越が未登録です（前年末の帳簿残数 50個）",
      }),
    ).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/settings/opening-balance?year=2027&purpose=hunting",
    );
    expect(
      within(hunting).getByRole("link", { name: "2027/02/01: 総残数が-25個になります" }),
    ).toHaveAttribute("href", "/lab/ammo-ledger/ledger?purpose=hunting&entry=entry-1");
    expect(
      within(screen.getByRole("region", { name: "用途共通の問題" })).getByRole("link", {
        name: "未確認の弾種が1件あります",
      }),
    ).toHaveAttribute("href", "/lab/ammo-ledger/settings/ammo-types/review");
    expect(screen.queryByRole("region", { name: "射撃用の問題" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "帳簿の確定・ロックを開く" }),
    ).not.toBeInTheDocument();
  });

  it("確定済みの期間に問題があれば、解除するためのロック設定へ案内する", () => {
    render(
      <LedgerPrintControls
        {...previewProps}
        isTargetLocked
        lockedThrough="2026-09-01"
        isPreview={false}
        lockIssues={[
          {
            kind: "missing_entry_detail",
            purpose: "shooting",
            entryId: "entry-1",
            occurredOn: "2026-08-01",
            message: "相手方住所が未設定",
            href: "/lab/ammo-ledger/ledger?purpose=shooting&entry=entry-1",
          },
        ]}
      />,
    );

    expect(
      screen.getByText("ロックを解除し、以下の問題を修正してから印刷してください"),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "帳簿の確定・ロックを開く" })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/settings/ledger-lock",
    );
  });
});
