"use client";

import dynamic from "next/dynamic";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";

export const LedgerPrintDocumentLazy = dynamic(
  () =>
    import("@/features/ammo-ledger/documents/ledger-print-document/ledger-print-document").then(
      (module) => ({
        default: module.LedgerPrintDocument,
      }),
    ),
  { loading: () => <WorkspaceViewLoader /> },
);
