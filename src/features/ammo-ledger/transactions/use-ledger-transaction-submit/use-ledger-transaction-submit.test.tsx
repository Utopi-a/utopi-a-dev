import { act, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { toast } from "sonner";
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

  it("保存の応答を待たずに帳簿へ移動し、確定後に本来のIDへ差し替える", async () => {
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
    const pendingId = new URLSearchParams(window.location.search).get("entry");
    expect(window.location.pathname).toBe("/lab/ammo-ledger/ledger");
    expect(pendingId).toMatch(/^pending-/);
    expect(result.current.ledger.pendingEntryIds.has(pendingId ?? "")).toBe(true);
    expect(result.current.ledger.workspace?.inventoryItems[0].bookStock).toBe(50);
    expect(createTransactionAction).toHaveBeenCalledWith(payload);

    const saved = buildTestEntry({
      id: "saved-entry",
      category: "consume",
      occurredOn: "2026-10-13",
      quantity: 50,
    });
    await act(async () => {
      save.resolve({ ok: true, ledgerEntryId: saved.id, entry: saved, redirectPath: "/" });
    });

    expect(new URLSearchParams(window.location.search).get("entry")).toBe("saved-entry");
    expect(result.current.ledger.pendingEntryIds.size).toBe(0);
    expect(result.current.ledger.workspace?.entries.map((entry) => entry.id)).toEqual([
      "carryover",
      "saved-entry",
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
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

  it("保存できなかった記録をアラートに残し、入力に戻ると入力値を返す", async () => {
    vi.mocked(createTransactionAction).mockRejectedValueOnce(new Error("network unavailable"));

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
      "消費記録（2026/10/13 テスト散弾 7.5号 50発）を保存できませんでした",
    );
    expect(alert).toHaveTextContent("保存できたか確認できませんでした");
    const restoreHref = screen.getByRole("link", { name: "入力に戻る" }).getAttribute("href") ?? "";
    expect(restoreHref).toMatch(/^\/lab\/ammo-ledger\/consume\/new\?restore=/);

    window.history.replaceState(null, "", restoreHref);
    rerender(
      <Providers>
        <Screen key="restored" />
      </Providers>,
    );
    expect(screen.getByTestId("restored")).toHaveTextContent("3");
  });
});
