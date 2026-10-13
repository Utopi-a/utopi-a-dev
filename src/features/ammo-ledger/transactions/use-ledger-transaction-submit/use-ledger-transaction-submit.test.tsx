import { act, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerOptimisticNavProvider } from "@/features/ammo-ledger/components/ammo-ledger-optimistic-nav/ammo-ledger-optimistic-nav";
import { PendingLedgerChangeAlerts } from "@/features/ammo-ledger/components/pending-ledger-change-alerts/pending-ledger-change-alerts";
import { createTransactionAction } from "@/features/ammo-ledger/transactions/create-transaction/create-transaction-action";
import type { LedgerTransactionPayload } from "@/features/ammo-ledger/transactions/prepare-optimistic-ledger-entry/prepare-optimistic-ledger-entry";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import {
  buildTestEntry,
  buildTestWorkspace,
} from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";
import { useLedgerTransactionSubmit } from "./use-ledger-transaction-submit";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock("@/features/ammo-ledger/transactions/create-transaction/create-transaction-action", () => ({
  createTransactionAction: vi.fn(),
}));
vi.mock("@/features/ammo-ledger/transactions/update-transaction/update-transaction-action", () => ({
  updateTransactionAction: vi.fn(),
}));

const workspacePayload = {
  ownerName: "テスト利用者",
  workspace: buildTestWorkspace({
    entries: [
      buildTestEntry({
        id: "carryover",
        category: "carryover",
        occurredOn: "2026-01-01",
        quantity: 100,
      }),
    ],
  }),
};

const payload: LedgerTransactionPayload = {
  inputKind: "consume",
  purpose: "shooting",
  occurredOn: "2026-10-13",
  ammoTypeId: "ammo-1",
  gunId: "gun-1",
  rangeId: "range-1",
  outerBoxCount: 0,
  boxCount: 2,
  looseRounds: 0,
};

function Providers({ children }: { children: ReactNode }) {
  return (
    <AmmoLedgerSwrProvider initialWorkspace={workspacePayload}>
      <AmmoLedgerOptimisticNavProvider>{children}</AmmoLedgerOptimisticNavProvider>
    </AmmoLedgerSwrProvider>
  );
}

function useSubmitAndWorkspace() {
  return {
    form: useLedgerTransactionSubmit<typeof payload>({ formKey: "consume" }),
    ledger: useAmmoLedgerWorkspace(),
  };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

describe("useLedgerTransactionSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/lab/ammo-ledger/consume/new");
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    // 確定後の再取得は保留させ、保存結果を書き込んだキャッシュを検証する。
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
  });

  afterEach(() => {
    toast.dismiss();
    vi.restoreAllMocks();
  });

  it("保存の応答を待たずに帳簿へ移動し、画面で決めた記録 ID のまま確定する", async () => {
    const save = deferred<Awaited<ReturnType<typeof createTransactionAction>>>();
    vi.mocked(createTransactionAction).mockReturnValueOnce(save.promise);
    const { result } = renderHook(useSubmitAndWorkspace, { wrapper: Providers });

    let submitResult: Awaited<ReturnType<typeof result.current.form.submit>> | undefined;
    await act(async () => {
      submitResult = await result.current.form.submit({
        payload,
        display: { rangeName: "テスト射撃場", rangeAddress: "千葉県" },
        subject: "消費記録",
        restoreValues: payload,
      });
    });

    expect(submitResult).toEqual({ ok: true });
    const entryId = new URLSearchParams(window.location.search).get("entry") ?? "";
    expect(window.location.pathname).toBe("/lab/ammo-ledger/ledger");
    expect(entryId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.current.ledger.pendingEntryIds.has(entryId)).toBe(true);
    expect(result.current.ledger.workspace?.inventoryItems[0].bookStock).toBe(50);
    expect(createTransactionAction).toHaveBeenCalledWith({ ...payload, ledgerEntryId: entryId });

    const saved = buildTestEntry({
      id: entryId,
      category: "consume",
      occurredOn: "2026-10-13",
      quantity: 50,
    });
    await act(async () => {
      save.resolve({
        ok: true,
        ledgerEntryId: saved.id,
        entry: saved,
        alreadySaved: false,
        redirectPath: "/",
      });
    });

    expect(new URLSearchParams(window.location.search).get("entry")).toBe(entryId);
    expect(result.current.ledger.pendingEntryIds.size).toBe(0);
    expect(result.current.ledger.workspace?.entries.map((entry) => entry.id)).toEqual([
      "carryover",
      entryId,
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("応答が届かなくても、取り直した帳簿に記録があれば保存済みとして扱う", async () => {
    vi.mocked(createTransactionAction).mockImplementationOnce(async (input) => {
      const { ledgerEntryId } = input as { ledgerEntryId: string };
      vi.mocked(fetch).mockResolvedValueOnce(
        Response.json({
          ...workspacePayload,
          workspace: {
            ...workspacePayload.workspace,
            entries: [
              ...workspacePayload.workspace.entries,
              buildTestEntry({
                id: ledgerEntryId,
                category: "consume",
                occurredOn: "2026-10-13",
                quantity: 50,
              }),
            ],
          },
        }),
      );
      throw new Error("response lost");
    });
    const { result } = renderHook(useSubmitAndWorkspace, {
      wrapper: ({ children }) => (
        <Providers>
          <Toaster />
          <PendingLedgerChangeAlerts />
          {children}
        </Providers>
      ),
    });
    await act(async () => {
      await result.current.form.submit({ payload, subject: "消費記録", restoreValues: payload });
    });

    expect(await screen.findByText(/消費記録（.*）は保存されていました/)).toBeVisible();
    expect(result.current.ledger.pendingEntryIds.size).toBe(0);
    expect(result.current.ledger.workspace?.entries).toHaveLength(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("在庫が足りない入力は送信も移動もせずにエラーを返す", async () => {
    const { result } = renderHook(useSubmitAndWorkspace, { wrapper: Providers });

    let submitResult: Awaited<ReturnType<typeof result.current.form.submit>> | undefined;
    await act(async () => {
      submitResult = await result.current.form.submit({
        payload: { ...payload, boxCount: 5 },
        subject: "消費記録",
        restoreValues: payload,
      });
    });

    expect(submitResult).toEqual({
      ok: false,
      error: "テスト散弾 7.5号の在庫が不足しています（残り100発、出庫125発）",
    });
    expect(createTransactionAction).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/lab/ammo-ledger/consume/new");
  });

  it("サーバーが拒否したら先行表示を取り消す", async () => {
    vi.mocked(createTransactionAction).mockResolvedValueOnce({
      ok: false,
      error: "射撃場が見つかりません",
    });
    const { result, unmount } = renderHook(useSubmitAndWorkspace, { wrapper: Providers });
    await act(async () => {
      await result.current.form.submit({
        payload,
        subject: "消費記録",
        restoreValues: { ...payload, looseRounds: 3 },
      });
    });

    expect(result.current.ledger.workspace?.entries.map((entry) => entry.id)).toEqual([
      "carryover",
    ]);
    unmount();
  });

  it("保存できたか分からない記録はアラートに残し、入力に戻って再送しても同じ記録 ID を使う", async () => {
    vi.mocked(createTransactionAction).mockRejectedValueOnce(new Error("network unavailable"));
    // 取り直した帳簿には記録がない（保存されていなかった）。
    vi.mocked(fetch).mockResolvedValue(Response.json(workspacePayload));

    function Screen() {
      const { form } = useSubmitAndWorkspace();
      return (
        <>
          <PendingLedgerChangeAlerts />
          <p data-testid="restored">{form.restoredValues?.looseRounds ?? "なし"}</p>
          <button
            type="button"
            onClick={() =>
              form.submit({
                payload,
                subject: "消費記録",
                restoreValues: { ...payload, looseRounds: 3 },
              })
            }
          >
            保存
          </button>
        </>
      );
    }

    const { rerender } = render(
      <Providers>
        <Screen key="first" />
      </Providers>,
    );
    await act(async () => screen.getByRole("button", { name: "保存" }).click());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "消費記録（2026/10/13 テスト散弾 7.5号 50個）を保存できたか確認できませんでした",
    );
    expect(alert).toHaveTextContent("二重に登録されることはありません");
    const firstEntryId = (
      vi.mocked(createTransactionAction).mock.calls[0][0] as { ledgerEntryId: string }
    ).ledgerEntryId;
    const restoreHref = screen.getByRole("link", { name: "入力に戻る" }).getAttribute("href") ?? "";
    expect(restoreHref).toMatch(/^\/lab\/ammo-ledger\/consume\/new\?restore=/);

    window.history.replaceState(null, "", restoreHref);
    rerender(
      <Providers>
        <Screen key="restored" />
      </Providers>,
    );
    expect(screen.getByTestId("restored")).toHaveTextContent("3");

    vi.mocked(createTransactionAction).mockReturnValueOnce(new Promise(() => {}));
    await act(async () => screen.getByRole("button", { name: "保存" }).click());
    expect(createTransactionAction).toHaveBeenLastCalledWith({
      ...payload,
      ledgerEntryId: firstEntryId,
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
