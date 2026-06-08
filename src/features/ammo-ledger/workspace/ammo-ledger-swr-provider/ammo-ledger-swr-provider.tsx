"use client";

import type { ReactNode } from "react";
import { SWRConfig, unstable_serialize } from "swr";
import type { AmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-payload/ammo-ledger-workspace-payload";
import { ammoLedgerWorkspaceQueryKey } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-query-key/ammo-ledger-workspace-query-key";

export const ammoLedgerWorkspaceSwrConfig = {
  revalidateOnFocus: false,
  keepPreviousData: true,
  errorRetryCount: 2,
} as const;

type AmmoLedgerSwrProviderProps = {
  children: ReactNode;
  initialWorkspace?: AmmoLedgerWorkspacePayload;
};

export function AmmoLedgerSwrProvider({ children, initialWorkspace }: AmmoLedgerSwrProviderProps) {
  const fallback = initialWorkspace
    ? { [unstable_serialize(ammoLedgerWorkspaceQueryKey)]: initialWorkspace }
    : undefined;

  return (
    <SWRConfig
      value={{
        ...ammoLedgerWorkspaceSwrConfig,
        fallback,
      }}
    >
      {children}
    </SWRConfig>
  );
}
