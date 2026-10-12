"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import type { AmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-payload/ammo-ledger-workspace-payload";
import { ammoLedgerWorkspaceQueryKey } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-query-key/ammo-ledger-workspace-query-key";
import {
  applyLedgerEntryChanges,
  type LedgerEntryChanges,
} from "@/features/ammo-ledger/workspace/apply-ledger-entry-changes/apply-ledger-entry-changes";

export type PendingLedgerChangeRestore = {
  formKey: string;
  href: string;
  values: unknown;
};

export type PendingLedgerChange = {
  id: string;
  /** saving: 保存待ち。confirmed: 保存済みでキャッシュ反映中。failed: 保存できなかった */
  status: "saving" | "confirmed" | "failed";
  overlay: LedgerEntryChanges;
  /** 追加・編集した行に「保存中」を表示するか。並び替えでは表示しない */
  marksEntriesSaving: boolean;
  summary: string;
  error?: string;
  restore?: PendingLedgerChangeRestore;
};

type PendingLedgerChangesContextValue = {
  changes: PendingLedgerChange[];
  begin: (change: Omit<PendingLedgerChange, "status">) => void;
  confirm: ({ id, overlay }: { id: string; overlay: LedgerEntryChanges }) => void;
  fail: ({ id, error }: { id: string; error: string }) => void;
  remove: ({ id }: { id: string }) => void;
  countSaving: () => number;
};

const noop = () => {};

const PendingLedgerChangesContext = createContext<PendingLedgerChangesContextValue>({
  changes: [],
  begin: noop,
  confirm: noop,
  fail: noop,
  remove: noop,
  countSaving: () => 0,
});

export function PendingLedgerChangesProvider({ children }: { children: ReactNode }) {
  const [changes, setChanges] = useState<PendingLedgerChange[]>([]);
  // 再描画を待たずに「保存待ちが残っているか」を判定するため、件数は ref で数える。
  const savingIdsRef = useRef(new Set<string>());

  const actions = useMemo(() => {
    function update({ id, patch }: { id: string; patch: Partial<PendingLedgerChange> }) {
      setChanges((current) =>
        current.map((change) => (change.id === id ? { ...change, ...patch } : change)),
      );
    }

    return {
      begin: (change: Omit<PendingLedgerChange, "status">) => {
        savingIdsRef.current.add(change.id);
        setChanges((current) => [...current, { ...change, status: "saving" }]);
      },
      confirm: ({ id, overlay }: { id: string; overlay: LedgerEntryChanges }) => {
        savingIdsRef.current.delete(id);
        update({ id, patch: { status: "confirmed", overlay } });
      },
      fail: ({ id, error }: { id: string; error: string }) => {
        savingIdsRef.current.delete(id);
        update({
          id,
          patch: { status: "failed", error, overlay: { upserted: [], removedIds: [] } },
        });
      },
      remove: ({ id }: { id: string }) => {
        savingIdsRef.current.delete(id);
        // 入力に戻って保存し直した・破棄した失敗の通知を残さない。
        toast.dismiss(id);
        setChanges((current) => current.filter((change) => change.id !== id));
      },
      countSaving: () => savingIdsRef.current.size,
    };
  }, []);

  const value = useMemo<PendingLedgerChangesContextValue>(
    () => ({ changes, ...actions }),
    [changes, actions],
  );

  const isSaving = changes.some((change) => change.status === "saving");
  useEffect(() => {
    if (!isSaving) {
      return;
    }
    // 保存の応答前に閉じると記録が残らない可能性があるため、ブラウザの確認を出す。
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSaving]);

  return (
    <PendingLedgerChangesContext.Provider value={value}>
      {children}
    </PendingLedgerChangesContext.Provider>
  );
}

export function usePendingLedgerChanges() {
  return useContext(PendingLedgerChangesContext);
}

export type PendingLedgerActionResult =
  | { ok: true; changes: LedgerEntryChanges }
  | { ok: false; error: string };

const unconfirmedSaveMessage =
  "通信が途切れたため、保存できたか確認できませんでした。帳簿に記録が表示されていれば保存済みです。";

/**
 * 保存の完了を待たずに帳簿へ反映し、サーバーの応答で確定・失敗を切り替える。
 * 失敗時は入力内容を保持し、通知とアラートから入力画面に戻れるようにする。
 */
export function useRunPendingLedgerChange() {
  const { begin, confirm, fail, remove, countSaving } = usePendingLedgerChanges();
  const { mutate } = useSWRConfig();
  const router = useRouter();

  return useCallback(
    ({
      overlay,
      marksEntriesSaving = true,
      summary,
      failureTitle = `${summary}を保存できませんでした`,
      restore,
      successMessage,
      action,
      onConfirmed,
      onFailed,
    }: {
      overlay: LedgerEntryChanges;
      marksEntriesSaving?: boolean;
      summary: string;
      failureTitle?: string;
      restore?: PendingLedgerChangeRestore;
      successMessage?: string;
      action: () => Promise<PendingLedgerActionResult>;
      onConfirmed?: ({ changes }: { changes: LedgerEntryChanges }) => void;
      onFailed?: () => void;
    }) => {
      const id = crypto.randomUUID();
      begin({ id, overlay, marksEntriesSaving, summary, restore });

      function revalidateWhenIdle() {
        if (countSaving() === 0) {
          void mutate(ammoLedgerWorkspaceQueryKey).catch(() => {});
        }
      }

      function handleFailure({ error }: { error: string }) {
        fail({ id, error });
        const restoreHref = restore ? buildRestoreHref({ href: restore.href, changeId: id }) : null;
        if (!restoreHref) {
          // 戻す入力がない取消・並び替えは、行を元に戻して通知するだけにする。
          remove({ id });
        }
        onFailed?.();
        toast.error(failureTitle, {
          id,
          description: error,
          duration: 10_000,
          action: restoreHref
            ? { label: "入力に戻る", onClick: () => router.push(restoreHref) }
            : undefined,
        });
      }

      void (async () => {
        let result: PendingLedgerActionResult;
        try {
          result = await action();
        } catch {
          handleFailure({ error: unconfirmedSaveMessage });
          revalidateWhenIdle();
          return;
        }

        if (!result.ok) {
          handleFailure({ error: result.error });
          revalidateWhenIdle();
          return;
        }

        // 先に保存結果を重ねてからキャッシュへ書き込み、行の重複や一瞬の消失を防ぐ。
        const { changes } = result;
        confirm({ id, overlay: changes });
        await mutate<AmmoLedgerWorkspacePayload>(
          ammoLedgerWorkspaceQueryKey,
          (current) =>
            current
              ? {
                  ...current,
                  workspace: applyLedgerEntryChanges({ workspace: current.workspace, changes }),
                }
              : current,
          { revalidate: false },
        );
        remove({ id });
        onConfirmed?.({ changes });
        if (successMessage) {
          toast.success(successMessage);
        }
        revalidateWhenIdle();
      })();
    },
    [begin, confirm, countSaving, fail, mutate, remove, router],
  );
}

export function buildRestoreHref({ href, changeId }: { href: string; changeId: string }): string {
  const url = new URL(href, "http://ammo-ledger.local");
  url.searchParams.set("restore", changeId);
  return `${url.pathname}${url.search}`;
}
