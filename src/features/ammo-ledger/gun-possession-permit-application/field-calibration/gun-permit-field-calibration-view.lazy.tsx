"use client";

import dynamic from "next/dynamic";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";

export const GunPermitFieldCalibrationViewLazy = dynamic(
  () =>
    import(
      "@/features/ammo-ledger/acquisition-permit-application/field-calibration/field-calibration-view"
    ).then((module) => ({
      default: function GunPermitFieldCalibrationView() {
        return (
          <module.FieldCalibrationView
            categoryFilter="gun-possession-permit"
            defaultTemplateId="hokkaido-form6-main"
          />
        );
      },
    })),
  { loading: () => <WorkspaceViewLoader />, ssr: false },
);
