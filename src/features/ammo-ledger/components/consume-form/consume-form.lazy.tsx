"use client";

import dynamic from "next/dynamic";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";

export const ConsumeFormLazy = dynamic(
  () =>
    import("@/features/ammo-ledger/components/consume-form/consume-form").then((module) => ({
      default: module.ConsumeForm,
    })),
  { loading: () => <WorkspaceViewLoader /> },
);
