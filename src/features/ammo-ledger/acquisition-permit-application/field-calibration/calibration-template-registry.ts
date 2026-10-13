import { gunPermitCalibrationTemplateEntries } from "@/features/ammo-ledger/gun-possession-permit-application/field-calibration/gun-permit-calibration-template-entries";
import type { FormTemplate } from "../form-template/form-template-types";
import { hokkaidoMainTemplate } from "../form-template/hokkaido-main/hokkaido-main-template";
import { ibarakiR7SupplementTemplate } from "../form-template/ibaraki-r7-supplement/ibaraki-r7-supplement-template";
import { calibrationSampleFieldValues } from "./calibration-sample-field-values";

export type CalibrationTemplateCategory = "acquisition-permit" | "gun-possession-permit";

export type CalibrationTemplateEntry = {
  id: string;
  label: string;
  template: FormTemplate;
  category: CalibrationTemplateCategory;
  sourceFilePath?: string;
  previewFieldValues?: Record<string, string>;
};

const acquisitionPermitCalibrationTemplateEntries: CalibrationTemplateEntry[] = [
  {
    id: hokkaidoMainTemplate.id,
    label: hokkaidoMainTemplate.label,
    template: hokkaidoMainTemplate,
    category: "acquisition-permit",
    sourceFilePath:
      "src/features/ammo-ledger/acquisition-permit-application/form-template/hokkaido-main/hokkaido-main-template.ts",
    previewFieldValues: calibrationSampleFieldValues,
  },
  {
    id: ibarakiR7SupplementTemplate.id,
    label: ibarakiR7SupplementTemplate.label,
    template: ibarakiR7SupplementTemplate,
    category: "acquisition-permit",
    sourceFilePath:
      "src/features/ammo-ledger/acquisition-permit-application/form-template/ibaraki-r7-supplement/ibaraki-r7-supplement-template.ts",
    previewFieldValues: calibrationSampleFieldValues,
  },
];

export const calibrationTemplateRegistry: CalibrationTemplateEntry[] = [
  ...acquisitionPermitCalibrationTemplateEntries,
  ...gunPermitCalibrationTemplateEntries,
];

export function findCalibrationTemplate({
  id,
}: {
  id: string;
}): CalibrationTemplateEntry | undefined {
  return calibrationTemplateRegistry.find((entry) => entry.id === id);
}
