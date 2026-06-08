"use client";

import dynamic from "next/dynamic";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";

export const BulkEntryFormLazy = dynamic(
  () =>
    import("@/features/ammo-ledger/components/bulk-entry-form/bulk-entry-form").then((module) => ({
      default: module.BulkEntryForm,
    })),
  { loading: () => <WorkspaceViewLoader /> },
);
