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
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import {
  applyLedgerEntryChanges,
  type LedgerEntryChanges,
} from "@/features/ammo-ledger/workspace/apply-ledger-entry-changes/apply-ledger-entry-changes";

export type PendingLedgerChangeRestore = {
  formKey: string;
  href: string;
  values: unknown;
  /** 新規作成の記録 ID。入力し直して再送しても同じ記録として扱い、二重登録を防ぐ */
  entryId?: string;
};

export type PendingLedgerChange = {
  id: string;
  /** saving: 保存待ち。confirmed: 保存済みでキャッシュ反映中。failed: 保存できなかった */
  status: "saving" | "confirmed" | "failed";
  overlay: LedgerEntryChanges;
  /** 追加・編集した行に「保存中」を表示するか。並び替えでは表示しない */
  marksEntriesSaving: boolean;
  summary: string;
  failureTitle?: string;
  error?: string;
  restore?: PendingLedgerChangeRestore;
};

type PendingLedgerChangesContextValue = {
  changes: PendingLedgerChange[];
  begin: (change: Omit<PendingLedgerChange, "status">) => void;
  confirm: ({ id, overlay }: { id: string; overlay: LedgerEntryChanges }) => void;
  fail: ({ id, title, error }: { id: string; title: string; error: string }) => void;
  remove: ({ id }: { id: string }) => void;
  countSaving: () => number;
  enqueue: <T>(task: () => Promise<T>) => Promise<T>;
};

const noop = () => {};

const PendingLedgerChangesContext = createContext<PendingLedgerChangesContextValue>({
  changes: [],
  begin: noop,
  confirm: noop,
  fail: noop,
  remove: noop,
  countSaving: () => 0,
  enqueue: (task) => task(),
});

export function PendingLedgerChangesProvider({ children }: { children: ReactNode }) {
  const [changes, setChanges] = useState<PendingLedgerChange[]>([]);
  // 再描画を待たずに「保存待ちが残っているか」を判定するため、件数は ref で数える。
  const savingIdsRef = useRef(new Set<string>());
  // 画面移動で Next.js の Server Action キューが切り替わっても、保存を送った順に処理させる。
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

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
      fail: ({ id, title, error }: { id: string; title: string; error: string }) => {
        savingIdsRef.current.delete(id);
        update({
          id,
          patch: {
            status: "failed",
            failureTitle: title,
            error,
            overlay: { upserted: [], removedIds: [] },
          },
        });
      },
      remove: ({ id }: { id: string }) => {
        savingIdsRef.current.delete(id);
        // 入力に戻って保存し直した・破棄した失敗の通知を残さない。
        toast.dismiss(id);
        setChanges((current) => current.filter((change) => change.id !== id));
      },
      countSaving: () => savingIdsRef.current.size,
      enqueue: <T,>(task: () => Promise<T>): Promise<T> => {
        const result = queueRef.current.then(task, task);
        queueRef.current = result.catch(() => {});
        return result;
      },
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
  | { ok: true; changes: LedgerEntryChanges; message?: string }
  | { ok: false; error: string };

const unconfirmedSaveMessage =
  "通信が途切れ、保存できたか確認できませんでした。帳簿に記録が表示されていれば保存済みです。表示されていなければ、入力に戻ってもう一度保存してください（同じ記録が二重に登録されることはありません）。";

/**
 * 保存の完了を待たずに帳簿へ反映し、サーバーの応答で確定・失敗を切り替える。
 * 失敗時は入力内容を保持し、通知とアラートから入力画面に戻れるようにする。
 */
export function useRunPendingLedgerChange() {
  const { begin, confirm, fail, remove, countSaving, enqueue } = usePendingLedgerChanges();
  const { mutate } = useSWRConfig();
  const router = useRouter();

  return useCallback(
    ({
      overlay,
      marksEntriesSaving = true,
      summary,
      failureTitle = `${summary}を保存できませんでした`,
      unknownTitle = `${summary}を保存できたか確認できませんでした`,
      unknownDescription = unconfirmedSaveMessage,
      restore,
      successMessage,
      action,
      isApplied,
      appliedMessage = `${summary}は保存されていました`,
      onConfirmed,
      onFailed,
    }: {
      overlay: LedgerEntryChanges;
      marksEntriesSaving?: boolean;
      summary: string;
      failureTitle?: string;
      /** 応答が届かず、保存されたか分からないときの見出しと説明 */
      unknownTitle?: string;
      unknownDescription?: string;
      restore?: PendingLedgerChangeRestore;
      successMessage?: string;
      action: () => Promise<PendingLedgerActionResult>;
      /** 応答が届かなかったとき、再取得した帳簿で保存済みかを判定する */
      isApplied?: (workspace: AmmoLedgerWorkspace) => boolean;
      appliedMessage?: string;
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

      function handleFailure({ title, error }: { title: string; error: string }) {
        fail({ id, title, error });
        const restoreHref = restore ? buildRestoreHref({ href: restore.href, changeId: id }) : null;
        if (!restoreHref) {
          // 戻す入力がない取消・並び替えは、行を元に戻して通知するだけにする。
          remove({ id });
        }
        onFailed?.();
        toast.error(title, {
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
          result = await enqueue(action);
        } catch {
          // 応答だけが失われた可能性があるため、帳簿を取り直して保存済みかを確かめる。
          const latest = isApplied
            ? await mutate<AmmoLedgerWorkspacePayload>(ammoLedgerWorkspaceQueryKey).catch(
                () => undefined,
              )
            : undefined;
          if (latest && isApplied?.(latest.workspace)) {
            remove({ id });
            onConfirmed?.({ changes: overlay });
            toast.success(appliedMessage);
            return;
          }
          handleFailure({ title: unknownTitle, error: unknownDescription });
          revalidateWhenIdle();
          return;
        }

        if (!result.ok) {
          handleFailure({ title: failureTitle, error: result.error });
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
        const message = result.message ?? successMessage;
        if (message) {
          toast.success(message);
        }
        revalidateWhenIdle();
      })();
    },
    [begin, confirm, countSaving, enqueue, fail, mutate, remove, router],
  );
}

export function buildRestoreHref({ href, changeId }: { href: string; changeId: string }): string {
  const url = new URL(href, "http://ammo-ledger.local");
  url.searchParams.set("restore", changeId);
  return `${url.pathname}${url.search}`;
}
