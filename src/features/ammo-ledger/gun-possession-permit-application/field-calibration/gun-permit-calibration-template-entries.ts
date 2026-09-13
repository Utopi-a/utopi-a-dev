import type { CalibrationTemplateEntry } from "@/features/ammo-ledger/acquisition-permit-application/field-calibration/calibration-template-registry";
import { hokkaidoForm6MainTemplate } from "../form-template/hokkaido-form6-main/hokkaido-form6-main-template";
import { hokkaidoForm6SupplementTemplate } from "../form-template/hokkaido-form6-supplement/hokkaido-form6-supplement-template";
import { hokkaidoForm9MainTemplate } from "../form-template/hokkaido-form9-main/hokkaido-form9-main-template";
import { hokkaidoForm9SupplementTemplate } from "../form-template/hokkaido-form9-supplement/hokkaido-form9-supplement-template";
import { hokkaidoForm13Template } from "../form-template/hokkaido-form13/hokkaido-form13-template";
import { hokkaidoResumeTemplate } from "../form-template/hokkaido-resume/hokkaido-resume-template";
import { gunPermitCalibrationSampleFieldValues } from "./gun-permit-calibration-sample-field-values";

const previewFieldValues = gunPermitCalibrationSampleFieldValues;

export const gunPermitCalibrationTemplateEntries: CalibrationTemplateEntry[] = [
  {
    id: hokkaidoForm6MainTemplate.id,
    label: hokkaidoForm6MainTemplate.label,
    template: hokkaidoForm6MainTemplate,
    category: "gun-possession-permit",
    sourceFilePath:
      "src/features/ammo-ledger/gun-possession-permit-application/form-template/hokkaido-form6-main/hokkaido-form6-main-template.ts",
    previewFieldValues,
  },
  {
    id: hokkaidoForm6SupplementTemplate.id,
    label: hokkaidoForm6SupplementTemplate.label,
    template: hokkaidoForm6SupplementTemplate,
    category: "gun-possession-permit",
    sourceFilePath:
      "src/features/ammo-ledger/gun-possession-permit-application/form-template/hokkaido-form6-supplement/hokkaido-form6-supplement-template.ts",
    previewFieldValues,
  },
  {
    id: hokkaidoForm9MainTemplate.id,
    label: hokkaidoForm9MainTemplate.label,
    template: hokkaidoForm9MainTemplate,
    category: "gun-possession-permit",
    sourceFilePath:
      "src/features/ammo-ledger/gun-possession-permit-application/form-template/hokkaido-form9-main/hokkaido-form9-main-template.ts",
    previewFieldValues,
  },
  {
    id: hokkaidoForm9SupplementTemplate.id,
    label: hokkaidoForm9SupplementTemplate.label,
    template: hokkaidoForm9SupplementTemplate,
    category: "gun-possession-permit",
    sourceFilePath:
      "src/features/ammo-ledger/gun-possession-permit-application/form-template/hokkaido-form9-supplement/hokkaido-form9-supplement-template.ts",
    previewFieldValues,
  },
  {
    id: hokkaidoResumeTemplate.id,
    label: hokkaidoResumeTemplate.label,
    template: hokkaidoResumeTemplate,
    category: "gun-possession-permit",
    sourceFilePath:
      "src/features/ammo-ledger/gun-possession-permit-application/form-template/hokkaido-resume/hokkaido-resume-template.ts",
    previewFieldValues,
  },
  {
    id: hokkaidoForm13Template.id,
    label: hokkaidoForm13Template.label,
    template: hokkaidoForm13Template,
    category: "gun-possession-permit",
    sourceFilePath:
      "src/features/ammo-ledger/gun-possession-permit-application/form-template/hokkaido-form13/hokkaido-form13-template.ts",
    previewFieldValues,
  },
];
