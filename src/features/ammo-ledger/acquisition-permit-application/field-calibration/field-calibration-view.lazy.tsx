"use client";

import dynamic from "next/dynamic";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";

export const FieldCalibrationViewLazy = dynamic(
  () =>
    import(
      "@/features/ammo-ledger/acquisition-permit-application/field-calibration/field-calibration-view"
    ).then((module) => ({
      default: module.FieldCalibrationView,
    })),
  { loading: () => <WorkspaceViewLoader />, ssr: false },
);
