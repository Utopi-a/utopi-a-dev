"use client";

import dynamic from "next/dynamic";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";

export const GunPermitApplicationFormLazy = dynamic(
  () =>
    import(
      "@/features/ammo-ledger/gun-possession-permit-application/components/gun-permit-application-form/gun-permit-application-form"
    ).then((module) => ({
      default: module.GunPermitApplicationForm,
    })),
  { loading: () => <WorkspaceViewLoader /> },
);
