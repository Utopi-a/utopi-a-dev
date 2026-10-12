"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";
import type { LedgerLockState } from "@/features/ammo-ledger/ledger/lock/lock-state-types";
import type { AmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-payload/ammo-ledger-workspace-payload";
import { ammoLedgerWorkspaceQueryKey } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-query-key/ammo-ledger-workspace-query-key";
import { applyLedgerEntryChanges } from "@/features/ammo-ledger/workspace/apply-ledger-entry-changes/apply-ledger-entry-changes";
import { fetchAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/fetch-ammo-ledger-workspace/fetch-ammo-ledger-workspace";
import { usePendingLedgerChanges } from "@/features/ammo-ledger/workspace/pending-ledger-changes/pending-ledger-changes";
import { workspaceStaleMs } from "@/features/ammo-ledger/workspace/workspace-stale-ms/workspace-stale-ms";

const workspaceSwrOptions = {
  keepPreviousData: true,
  revalidateOnFocus: true,
  focusThrottleInterval: workspaceStaleMs,
  // SSR と画面ごとの再マウントで全帳簿を重複取得しない。変更時と再接続時に更新する。
  revalidateIfStale: false,
  dedupingInterval: workspaceStaleMs,
} as const;

export function useAmmoLedgerWorkspace({
  revalidateOnMount,
}: {
  revalidateOnMount?: boolean;
} = {}) {
  const { data, isLoading, isValidating, error, mutate } = useSWR(
    ammoLedgerWorkspaceQueryKey,
    fetchAmmoLedgerWorkspace,
    { ...workspaceSwrOptions, revalidateOnMount },
  );

  const { changes } = usePendingLedgerChanges();
  const appliedChanges = useMemo(
    () => changes.filter((change) => change.status !== "failed"),
    [changes],
  );
  // 保存待ちの変更を確定済みデータに重ね、帳簿・残弾・入力時の在庫確認を同じ表示にそろえる。
  const workspace = useMemo(
    () =>
      data &&
      appliedChanges.reduce(
        (current, change) =>
          applyLedgerEntryChanges({ workspace: current, changes: change.overlay }),
        data.workspace,
      ),
    [data, appliedChanges],
  );
  const pendingEntryIds = useMemo(
    () =>
      new Set(
        appliedChanges
          .filter((change) => change.status === "saving" && change.marksEntriesSaving)
          .flatMap((change) => change.overlay.upserted.map((entry) => entry.id)),
      ),
    [appliedChanges],
  );

  const hasData = data !== undefined;

  return {
    workspace,
    pendingEntryIds,
    ownerName: data?.ownerName,
    isLoading: !hasData && isLoading,
    isRefreshing: hasData && isValidating,
    error,
    retry: () => {
      void mutate().catch(() => {});
    },
  };
}

export function useRequestAmmoLedgerWorkspaceRevalidation() {
  const { mutate } = useSWRConfig();

  return useCallback(() => {
    void mutate(ammoLedgerWorkspaceQueryKey).catch(() => {
      toast.error("帳簿の表示を更新できませんでした。再試行してください。");
    });
  }, [mutate]);
}

export function useInvalidateAmmoLedgerWorkspace() {
  const { mutate } = useSWRConfig();

  return useCallback(async () => {
    try {
      await mutate(ammoLedgerWorkspaceQueryKey);
    } catch {
      // 書込成功後の再取得失敗を、保存失敗として扱わない。
      toast.error("変更は保存済みですが、帳簿の表示を更新できませんでした。");
    }
  }, [mutate]);
}

export function useUpdateAmmoLedgerLockState() {
  const { mutate } = useSWRConfig();
  return useCallback(
    ({ lockState }: { lockState: LedgerLockState }) => {
      void mutate<AmmoLedgerWorkspacePayload>(
        ammoLedgerWorkspaceQueryKey,
        (current) =>
          current ? { ...current, workspace: { ...current.workspace, lockState } } : current,
        { revalidate: false },
      );
    },
    [mutate],
  );
}

export { workspaceStaleMs };
