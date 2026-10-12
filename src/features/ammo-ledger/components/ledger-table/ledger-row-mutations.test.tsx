import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MasterListItem } from "@/features/ammo-ledger/components/master-list-item/master-list-item";
import { MasterRowActions } from "@/features/ammo-ledger/components/master-row-actions/master-row-actions";
import { PendingLedgerChangeAlerts } from "@/features/ammo-ledger/components/pending-ledger-change-alerts/pending-ledger-change-alerts";
import { reorderLedgerEntryAction } from "@/features/ammo-ledger/transactions/reorder-ledger-entry/reorder-ledger-entry-action";
import { voidLedgerEntryAction } from "@/features/ammo-ledger/transactions/void-ledger-entry/void-ledger-entry-action";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import type { AmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-payload/ammo-ledger-workspace-payload";
import {
  buildTestEntry,
  buildTestWorkspace,
} from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { usePendingLedgerChanges } from "@/features/ammo-ledger/workspace/pending-ledger-changes/pending-ledger-changes";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";
import { LedgerEntryReorderButtons } from "./ledger-entry-reorder-buttons";
import { VoidLedgerEntryButton } from "./void-ledger-entry-button";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  useSearchParams: () => new URLSearchParams(),
}));
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
  workspace: buildTestWorkspace({
    entries: [
      buildTestEntry({
        id: "acquire",
        category: "acquire",
        occurredOn: "2026-03-01",
        quantity: 50,
      }),
      buildTestEntry({ id: "first", category: "consume", occurredOn: "2026-04-01", quantity: 10 }),
      buildTestEntry({
        id: "second",
        category: "consume",
        occurredOn: "2026-04-01",
        quantity: 20,
        dayOrder: 1,
      }),
    ],
  }),
};

function WorkspaceStatus() {
  const { workspace, isRefreshing } = useAmmoLedgerWorkspace();
  return (
    <>
      <p>{isRefreshing ? "帳簿更新中" : "帳簿更新待ちなし"}</p>
      <p data-testid="entry-order">{workspace?.entries.map((entry) => entry.id).join(",")}</p>
    </>
  );
}

function renderWithWorkspace(children: ReactNode) {
  return render(
    <AmmoLedgerSwrProvider initialWorkspace={workspacePayload}>
      <Toaster />
      <WorkspaceStatus />
      {children}
    </AmmoLedgerSwrProvider>,
  );
}

function entryOrder() {
  return screen.getByTestId("entry-order").textContent;
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

const secondEntry = workspacePayload.workspace.entries[2];

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

  it("取消は確認後すぐ帳簿から外し、保存の完了を待たない", async () => {
    const save = deferred<{ ok: true }>();
    vi.mocked(voidLedgerEntryAction).mockReturnValueOnce(save.promise);
    const onVoidStarted = vi.fn();
    renderWithWorkspace(
      <VoidLedgerEntryButton entry={secondEntry} onVoidStarted={onVoidStarted} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(voidLedgerEntryAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "取り消す" }));

    expect(entryOrder()).toBe("acquire,first");
    expect(onVoidStarted).toHaveBeenCalledTimes(1);
    // 保存は送信順を保つキューを通すため、次のマイクロタスクで送られる。
    await waitFor(() =>
      expect(voidLedgerEntryAction).toHaveBeenCalledWith({ ledgerEntryId: "second" }),
    );

    // 確定後の再取得は保留させ、保存結果をキャッシュへ書いた状態を確かめる。
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    await act(async () => save.resolve({ ok: true }));
    expect(await screen.findByText("帳簿行を取消しました")).toBeVisible();
    expect(entryOrder()).toBe("acquire,first");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("取消の保存待ちは画面上部に件数を表示し、確定すると消える", async () => {
    const save = deferred<{ ok: true }>();
    vi.mocked(voidLedgerEntryAction).mockReturnValueOnce(save.promise);
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    renderWithWorkspace(
      <>
        <PendingLedgerChangeAlerts />
        <VoidLedgerEntryButton entry={secondEntry} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    fireEvent.click(screen.getByRole("button", { name: "取り消す" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "帳簿への保存を待っている変更が1件あります",
    );
    await act(async () => save.resolve({ ok: true }));
    expect(screen.queryByText(/保存を待っている変更/)).not.toBeInTheDocument();
  });

  it("取消が拒否されたら記録を元に戻し、理由を通知する", async () => {
    vi.mocked(voidLedgerEntryAction).mockResolvedValueOnce({
      ok: false,
      error: "帳簿はロック済みです",
    });
    renderWithWorkspace(<VoidLedgerEntryButton entry={secondEntry} />);
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    fireEvent.click(screen.getByRole("button", { name: "取り消す" }));

    expect(await screen.findByText("帳簿はロック済みです")).toBeVisible();
    expect(entryOrder()).toBe("acquire,first,second");
  });

  it("取消の通信が途切れたら記録を元に戻し、保存状況の確認を促す", async () => {
    vi.mocked(voidLedgerEntryAction).mockRejectedValueOnce(new Error("network unavailable"));
    renderWithWorkspace(<VoidLedgerEntryButton entry={secondEntry} />);
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    fireEvent.click(screen.getByRole("button", { name: "取り消す" }));

    expect(await screen.findByText(/取消が反映されたか確認できませんでした/)).toBeVisible();
    expect(entryOrder()).toBe("acquire,first,second");
  });

  it("取消の応答が届かなくても、取り直した帳簿で反映済みなら元に戻さない", async () => {
    vi.mocked(voidLedgerEntryAction).mockRejectedValueOnce(new Error("response lost"));
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        ...workspacePayload,
        workspace: buildTestWorkspace({
          entries: workspacePayload.workspace.entries.filter((entry) => entry.id !== "second"),
        }),
      }),
    );
    renderWithWorkspace(<VoidLedgerEntryButton entry={secondEntry} />);
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    fireEvent.click(screen.getByRole("button", { name: "取り消す" }));

    expect(await screen.findByText(/記録の取消は反映されていました/)).toBeVisible();
    expect(entryOrder()).toBe("acquire,first");
  });

  it("後の消費が在庫不足になる取消は送信せず、理由を表示する", () => {
    renderWithWorkspace(<VoidLedgerEntryButton entry={workspacePayload.workspace.entries[0]} />);
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    fireEvent.click(screen.getByRole("button", { name: "取り消す" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "取り消すとテスト散弾 7.5号の在庫が不足しています",
    );
    expect(voidLedgerEntryAction).not.toHaveBeenCalled();
    expect(entryOrder()).toBe("acquire,first,second");
  });

  it("並び替えは押した時点で順番を入れ替え、続けて操作できる", async () => {
    const save = deferred<Awaited<ReturnType<typeof reorderLedgerEntryAction>>>();
    vi.mocked(reorderLedgerEntryAction).mockReturnValueOnce(save.promise);
    renderWithWorkspace(
      <LedgerEntryReorderButtons ledgerEntryId="second" canMoveUp canMoveDown={false} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "上へ" }));

    expect(entryOrder()).toBe("acquire,second,first");
    expect(screen.getByRole("button", { name: "上へ" })).toBeEnabled();
    await waitFor(() =>
      expect(reorderLedgerEntryAction).toHaveBeenCalledWith({
        ledgerEntryId: "second",
        direction: "up",
      }),
    );
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    await act(async () =>
      save.resolve({
        ok: true,
        dayOrders: [
          { id: "second", dayOrder: 0 },
          { id: "first", dayOrder: 1 },
        ],
      }),
    );
    expect(entryOrder()).toBe("acquire,second,first");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("同じ日に保存中の記録があるうちは並び替えを送らない", () => {
    function StartSavingSameDay() {
      const { begin } = usePendingLedgerChanges();
      return (
        <button
          type="button"
          onClick={() =>
            begin({
              id: "saving-change",
              marksEntriesSaving: true,
              summary: "保存中の記録",
              overlay: {
                upserted: [
                  buildTestEntry({
                    id: "saving-entry",
                    category: "consume",
                    occurredOn: "2026-04-01",
                    quantity: 5,
                    dayOrder: 2,
                  }),
                ],
                removedIds: [],
              },
            })
          }
        >
          保存中の記録を追加
        </button>
      );
    }
    renderWithWorkspace(
      <>
        <StartSavingSameDay />
        <LedgerEntryReorderButtons ledgerEntryId="second" canMoveUp canMoveDown />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "保存中の記録を追加" }));
    fireEvent.click(screen.getByRole("button", { name: "下へ" }));

    expect(screen.getByRole("alert")).toHaveTextContent("保存が終わってから並び替えてください");
    expect(reorderLedgerEntryAction).not.toHaveBeenCalled();
  });

  it("並び替えの通信が途切れたら元の順番に戻して通知する", async () => {
    vi.mocked(reorderLedgerEntryAction).mockRejectedValueOnce(new Error("network unavailable"));
    renderWithWorkspace(
      <LedgerEntryReorderButtons ledgerEntryId="second" canMoveUp canMoveDown={false} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "上へ" }));

    expect(await screen.findByText("並び順を変更できたか確認できませんでした")).toBeVisible();
    expect(entryOrder()).toBe("acquire,first,second");
  });

  it("マスター削除は確認ダイアログで内容を伝え、やめると削除しない", () => {
    const deleteAction = vi.fn();
    renderWithWorkspace(
      <MasterRowActions
        recordId="permit-1"
        deletedSubject="譲受許可"
        deleteNote="この許可の取得・繰越の記録も削除され、帳簿の許可残数が変わります。"
        deleteAction={deleteAction}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    const dialog = screen.getByRole("dialog", { name: "譲受許可を削除しますか？" });
    expect(dialog).toHaveTextContent("帳簿の許可残数が変わります");
    fireEvent.click(screen.getByRole("button", { name: "やめる" }));
    expect(deleteAction).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("マスター削除は確認後すぐ行を隠し、通信例外なら行を戻して再操作できる", async () => {
    const save = deferred<{ ok: true }>();
    const deleteAction = vi.fn().mockReturnValueOnce(save.promise);
    renderWithWorkspace(
      <ul>
        <MasterListItem>
          <span>テスト射撃場</span>
          <MasterRowActions
            recordId="master-1"
            deletedSubject="射撃場"
            deleteAction={deleteAction}
          />
        </MasterListItem>
      </ul>,
    );
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    expect(screen.getByText("テスト射撃場")).not.toBeVisible();
    await act(async () => save.reject(new Error("network unavailable")));

    expect(screen.getByText("テスト射撃場")).toBeVisible();
    expect(await screen.findByRole("alert")).toHaveTextContent(/削除結果を確認できませんでした/);
    expect(screen.getByRole("button", { name: "削除" })).toBeEnabled();
    // 戻した行の削除ボタンにフォーカスを戻し、キーボードで続けて操作できる。
    await waitFor(() => expect(screen.getByRole("button", { name: "削除" })).toHaveFocus());
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
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    expect(await screen.findByText("帳簿更新中")).toBeVisible();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "削除" })).toBeEnabled();
    await act(async () => resolveRead(Response.json(workspacePayload)));
  });
});
