"use client";

import useSWR from "swr";
import type { MasterPickerData } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import type { CatalogKind } from "@/features/ammo-ledger/catalog/schema/catalog-kind";

const pickerDataSwrOptions = {
  revalidateOnFocus: false,
  revalidateOnMount: true,
  dedupingInterval: 60_000,
} as const;

function buildPickerDataQueryKey({
  catalogKind,
  includeRangeCatalog,
}: {
  catalogKind: CatalogKind;
  includeRangeCatalog: boolean;
}) {
  return ["ammo-ledger", "picker-data", catalogKind, includeRangeCatalog] as const;
}

export function useMasterPickerData({
  catalogKind,
  includeRangeCatalog = false,
  enabled,
}: {
  catalogKind: CatalogKind;
  includeRangeCatalog?: boolean;
  enabled: boolean;
}) {
  const queryKey = buildPickerDataQueryKey({ catalogKind, includeRangeCatalog });

  const { data, isLoading, error, mutate } = useSWR<MasterPickerData>(
    enabled ? queryKey : null,
    async () => {
      const params = new URLSearchParams({
        kind: catalogKind,
        includeRangeCatalog: includeRangeCatalog ? "1" : "0",
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

export function resolveMasterPickerData({
  pickerData,
  loadedPickerData,
}: {
  pickerData?: MasterPickerData;
  loadedPickerData?: MasterPickerData;
}): MasterPickerData | undefined {
  return pickerData ?? loadedPickerData;
}
