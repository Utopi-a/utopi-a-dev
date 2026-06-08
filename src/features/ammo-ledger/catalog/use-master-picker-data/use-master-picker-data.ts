"use client";

import useSWR from "swr";
import { getMasterPickerDataAction } from "@/features/ammo-ledger/catalog/get-master-picker-data-action/get-master-picker-data-action";
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

  const { data, isLoading, error } = useSWR(
    enabled ? queryKey : null,
    () => getMasterPickerDataAction({ catalogKind, includeRangeCatalog }),
    pickerDataSwrOptions,
  );

  return {
    pickerData: data,
    isLoading,
    error,
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
