"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { ammoLedgerWorkspaceQueryKey } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-query-key/ammo-ledger-workspace-query-key";
import { getAmmoLedgerWorkspaceAction } from "@/features/ammo-ledger/workspace/get-ammo-ledger-workspace-action/get-ammo-ledger-workspace-action";

const workspaceSwrOptions = {
  keepPreviousData: true,
  revalidateOnFocus: false,
  revalidateOnMount: false,
  dedupingInterval: 3_000,
} as const;

export function useAmmoLedgerWorkspace() {
  const { data, isLoading, isValidating, error } = useSWR(
    ammoLedgerWorkspaceQueryKey,
    getAmmoLedgerWorkspaceAction,
    workspaceSwrOptions,
  );

  const hasData = data !== undefined;

  return {
    workspace: data?.workspace,
    ownerName: data?.ownerName,
    isLoading: !hasData && isLoading,
    isRefreshing: hasData && isValidating,
    error,
  };
}

export function useRequestAmmoLedgerWorkspaceRevalidation() {
  const { mutate } = useSWRConfig();

  return useCallback(() => {
    void mutate(ammoLedgerWorkspaceQueryKey);
  }, [mutate]);
}

export function useInvalidateAmmoLedgerWorkspace() {
  const { mutate } = useSWRConfig();

  return useCallback(async () => {
    await mutate(ammoLedgerWorkspaceQueryKey);
  }, [mutate]);
}
