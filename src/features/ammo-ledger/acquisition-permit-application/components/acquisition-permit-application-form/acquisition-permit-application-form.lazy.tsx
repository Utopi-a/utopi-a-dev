"use client";

import dynamic from "next/dynamic";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";

export const AcquisitionPermitApplicationFormLazy = dynamic(
  () =>
    import(
      "@/features/ammo-ledger/acquisition-permit-application/components/acquisition-permit-application-form/acquisition-permit-application-form"
    ).then((module) => ({
      default: module.AcquisitionPermitApplicationForm,
    })),
  { loading: () => <WorkspaceViewLoader /> },
);
