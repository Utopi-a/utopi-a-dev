import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lockLedgerAction } from "@/features/ammo-ledger/ledger/lock/lock-ledger-action/lock-ledger-action";
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
        lockIssues={[{ entryId: "entry-1", occurredOn: "2026-09-01", message: "種類別残が負" }]}
      />,
    );
    await act(async () => {});
    expect(window.print).not.toHaveBeenCalled();
  });
});
