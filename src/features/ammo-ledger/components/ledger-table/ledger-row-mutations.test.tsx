import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { Toaster, toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MasterRowActions } from "@/features/ammo-ledger/components/master-row-actions/master-row-actions";
import { reorderLedgerEntryAction } from "@/features/ammo-ledger/transactions/reorder-ledger-entry/reorder-ledger-entry-action";
import { voidLedgerEntryAction } from "@/features/ammo-ledger/transactions/void-ledger-entry/void-ledger-entry-action";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import type { AmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-payload/ammo-ledger-workspace-payload";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";
import { LedgerEntryReorderButtons } from "./ledger-entry-reorder-buttons";
import { VoidLedgerEntryButton } from "./void-ledger-entry-button";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/features/ammo-ledger/transactions/void-ledger-entry/void-ledger-entry-action", () => ({
  voidLedgerEntryAction: vi.fn(),
}));
vi.mock(
  "@/features/ammo-ledger/transactions/reorder-ledger-entry/reorder-ledger-entry-action",
  () => ({
    reorderLedgerEntryAction: vi.fn(),
  }),
);

const workspacePayload: AmmoLedgerWorkspacePayload = {
  ownerName: "テスト利用者",
  workspace: {
    entries: [],
    permitEvents: [],
    permits: [],
    profile: null,
    inventoryItems: [],
    guns: [],
    lockState: { isLocked: false, lockedThrough: null },
  },
};

function WorkspaceStatus() {
  const { isRefreshing } = useAmmoLedgerWorkspace();
  return <p>{isRefreshing ? "帳簿更新中" : "帳簿更新待ちなし"}</p>;
}

function renderWithWorkspace(children: ReactNode) {
  return render(
    <AmmoLedgerSwrProvider initialWorkspace={workspacePayload}>
      <WorkspaceStatus />
      {children}
    </AmmoLedgerSwrProvider>,
  );
}

function CancellableRow({ closeOnVoid = false }: { closeOnVoid?: boolean }) {
  const [voided, setVoided] = useState(false);
  const [open, setOpen] = useState(true);
  return (
    <>
      <p>{voided ? "記録は取消済み" : "記録は有効"}</p>
      {open ? (
        <VoidLedgerEntryButton
          ledgerEntryId="entry-1"
          onVoided={() => {
            setVoided(true);
            if (closeOnVoid) setOpen(false);
          }}
          onVoidFailed={() => setVoided(false)}
        />
      ) : (
        <button type="button" onClick={() => setOpen(true)}>
          記録を開く
        </button>
      )}
    </>
  );
}

describe("帳簿行とマスターの非同期操作", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(workspacePayload));
  });

  afterEach(() => {
    toast.dismiss();
    vi.restoreAllMocks();
  });

  it("取消でシートが閉じた後の通信失敗も通知し、記録を元に戻す", async () => {
    vi.mocked(voidLedgerEntryAction).mockRejectedValueOnce(new Error("network unavailable"));
    renderWithWorkspace(
      <>
        <Toaster />
        <CancellableRow closeOnVoid />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    expect(await screen.findByText(/取消結果を確認できませんでした/)).toBeVisible();
    expect(screen.getByText("記録は有効")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "記録を開く" }));
    expect(screen.getByRole("button", { name: "取消" })).toBeEnabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("取消の通信例外後は保留中を解除して再操作できる", async () => {
    vi.mocked(voidLedgerEntryAction).mockRejectedValueOnce(new Error("network unavailable"));
    renderWithWorkspace(<CancellableRow />);
    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    expect(await screen.findByText(/取消結果を確認できませんでした/)).toBeVisible();
    expect(screen.getByRole("button", { name: "取消" })).toBeEnabled();
    expect(screen.getByText("記録は有効")).toBeVisible();
  });

  it("取消が拒否された場合は記録を元に戻して理由を表示する", async () => {
    vi.mocked(voidLedgerEntryAction).mockResolvedValueOnce({
      ok: false,
      error: "帳簿はロック済みです",
    });
    renderWithWorkspace(<CancellableRow />);
    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    expect(await screen.findByText("帳簿はロック済みです")).toBeVisible();
    expect(screen.getByText("記録は有効")).toBeVisible();
    expect(screen.getByRole("button", { name: "取消" })).toBeEnabled();
  });

  it("取消成功後の帳簿再取得に失敗しても取消を元に戻さない", async () => {
    vi.mocked(voidLedgerEntryAction).mockResolvedValueOnce({ ok: true });
    vi.mocked(fetch).mockRejectedValueOnce(new Error("read unavailable"));
    renderWithWorkspace(<CancellableRow />);
    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: "取消" })).toBeEnabled();
    expect(screen.getByText("記録は取消済み")).toBeVisible();
    expect(screen.queryByText(/取消結果を確認できませんでした/)).not.toBeInTheDocument();
  });

  it("並び替え通信の失敗を表示し、上下ボタンを再操作できる", async () => {
    vi.mocked(reorderLedgerEntryAction).mockRejectedValueOnce(new Error("network unavailable"));
    renderWithWorkspace(
      <LedgerEntryReorderButtons ledgerEntryId="entry-1" canMoveUp canMoveDown />,
    );
    fireEvent.click(screen.getByRole("button", { name: "上へ" }));

    expect(await screen.findByText(/並び替えの結果を確認できませんでした/)).toBeVisible();
    expect(screen.getByRole("button", { name: "上へ" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "下へ" })).toBeEnabled();
  });

  it("並び替えは更新後の帳簿を受け取るまで連続操作を防ぐ", async () => {
    vi.mocked(reorderLedgerEntryAction).mockResolvedValueOnce({ ok: true });
    let resolveRead: (response: Response) => void = () => {};
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
    );
    renderWithWorkspace(
      <LedgerEntryReorderButtons ledgerEntryId="entry-1" canMoveUp canMoveDown />,
    );
    fireEvent.click(screen.getByRole("button", { name: "上へ" }));

    expect(await screen.findByText("帳簿更新中")).toBeVisible();
    expect(screen.getByRole("button", { name: "上へ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "下へ" })).toBeDisabled();
    await act(async () => resolveRead(Response.json(workspacePayload)));
    await waitFor(() => expect(screen.getByRole("button", { name: "上へ" })).toBeEnabled());
  });

  it("マスター削除の通信例外後はエラーを表示し、再操作できる", async () => {
    const deleteAction = vi.fn().mockRejectedValueOnce(new Error("network unavailable"));
    renderWithWorkspace(
      <MasterRowActions recordId="master-1" deletedSubject="射撃場" deleteAction={deleteAction} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(await screen.findByText(/削除結果を確認できませんでした/)).toBeVisible();
    expect(screen.getByRole("button", { name: "削除" })).toBeEnabled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("マスター削除後は全帳簿の再取得を待たずに一覧を更新する", async () => {
    const deleteAction = vi.fn().mockResolvedValueOnce({ ok: true });
    let resolveRead: (response: Response) => void = () => {};
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
    );
    renderWithWorkspace(
      <MasterRowActions recordId="master-1" deletedSubject="射撃場" deleteAction={deleteAction} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(await screen.findByText("帳簿更新中")).toBeVisible();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "削除" })).toBeEnabled();
    await act(async () => resolveRead(Response.json(workspacePayload)));
  });
});
