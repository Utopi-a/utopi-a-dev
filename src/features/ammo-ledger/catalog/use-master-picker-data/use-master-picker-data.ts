"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import type {
  MasterPickerData,
  PickerMasterEntry,
} from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import type { CatalogKind } from "@/features/ammo-ledger/catalog/schema/catalog-kind";
import type { InputKind } from "@/features/ammo-ledger/schema/input-kind";

const pickerDataSwrOptions = {
  revalidateOnFocus: false,
  revalidateOnMount: true,
  dedupingInterval: 60_000,
} as const;

const pickerDataQueryKeyPrefix = ["ammo-ledger", "picker-data"] as const;

function buildPickerDataQueryKey({
  catalogKind,
  includeRangeCatalog,
  recentInputKinds,
}: {
  catalogKind: CatalogKind;
  includeRangeCatalog: boolean;
  recentInputKinds: string;
}) {
  return [...pickerDataQueryKeyPrefix, catalogKind, includeRangeCatalog, recentInputKinds] as const;
}

export function useMasterPickerData({
  catalogKind,
  includeRangeCatalog = false,
  recentInputKinds,
  enabled,
}: {
  catalogKind: CatalogKind;
  includeRangeCatalog?: boolean;
  /** 「最近使った」に出す相手を、この区分の記録で使った相手に絞る */
  recentInputKinds?: InputKind[];
  enabled: boolean;
}) {
  const recentInputKindsParam = recentInputKinds?.join(",") ?? "";
  const queryKey = buildPickerDataQueryKey({
    catalogKind,
    includeRangeCatalog,
    recentInputKinds: recentInputKindsParam,
  });

  const { data, isLoading, error, mutate } = useSWR<MasterPickerData>(
    enabled ? queryKey : null,
    async () => {
      const params = new URLSearchParams({
        kind: catalogKind,
        includeRangeCatalog: includeRangeCatalog ? "1" : "0",
        recentInputKinds: recentInputKindsParam,
      });
      const response = await fetch(`/api/ammo-ledger/picker?${params}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok || response.redirected)
        throw new Error("一覧を取得できませんでした。再試行してください。");
      return response.json();
    },
    pickerDataSwrOptions,
  );

  return {
    pickerData: data,
    isLoading,
    error,
    retry: () => {
      void mutate().catch(() => {});
    },
  };
}

/** 射撃場・購入先を追加・削除した後、次に開くピッカーへ即座に反映する。 */
export function useInvalidateMasterPickerData() {
  const { mutate } = useSWRConfig();
  return useCallback(() => {
    void mutate(
      (key) =>
        Array.isArray(key) &&
        key[0] === pickerDataQueryKeyPrefix[0] &&
        key[1] === pickerDataQueryKeyPrefix[1],
    ).catch(() => {});
  }, [mutate]);
}

/** 選択中の射撃場・相手方の名称と住所を、帳簿の先行表示に使う。 */
export function findPickerMaster({
  pickerData,
  id,
}: {
  pickerData?: MasterPickerData;
  id: string;
}): PickerMasterEntry | undefined {
  if (!pickerData) {
    return undefined;
  }
  return [
    ...pickerData.recent,
    ...pickerData.registered,
    ...(pickerData.registeredRangeMasters ?? []),
  ].find((master) => master.id === id);
}

export function resolveMasterPickerData({
  pickerData,
  loadedPickerData,
}: {
  pickerData?: MasterPickerData;
  loadedPickerData?: MasterPickerData;
}): MasterPickerData | undefined {
  return pickerData ?? loadedPickerData;
}
