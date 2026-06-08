"use client";

import useSWR from "swr";
import { getDraftTransactionAction } from "@/features/ammo-ledger/transactions/get-draft/get-draft-transaction-action";

const draftSwrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
} as const;

export function useDraftTransaction({ draftId }: { draftId: string | null }) {
  const { data, isLoading } = useSWR(
    draftId ? (["ammo-ledger", "draft", draftId] as const) : null,
    () => getDraftTransactionAction({ draftId: draftId as string }),
    draftSwrOptions,
  );

  return {
    draft: data ?? null,
    isLoading: draftId !== null && isLoading,
  };
}
