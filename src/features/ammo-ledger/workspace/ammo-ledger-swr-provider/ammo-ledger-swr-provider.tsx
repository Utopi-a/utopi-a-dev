"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";

type AmmoLedgerSwrProviderProps = {
  children: ReactNode;
};

export function AmmoLedgerSwrProvider({ children }: AmmoLedgerSwrProviderProps) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        keepPreviousData: true,
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
