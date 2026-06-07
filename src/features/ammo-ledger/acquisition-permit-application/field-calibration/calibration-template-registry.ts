import type { FormTemplate } from "../form-template/form-template-types";
import { hokkaidoMainTemplate } from "../form-template/hokkaido-main/hokkaido-main-template";
import { ibarakiR7SupplementTemplate } from "../form-template/ibaraki-r7-supplement/ibaraki-r7-supplement-template";

export type CalibrationTemplateEntry = {
  id: string;
  label: string;
  template: FormTemplate;
  sourceFilePath?: string;
  /** repeatingRows は別 UI が必要なため、現状は static fields のみ編集可能 */
  supportsRepeatingRows: boolean;
};

export const calibrationTemplateRegistry: CalibrationTemplateEntry[] = [
  {
    id: hokkaidoMainTemplate.id,
    label: hokkaidoMainTemplate.label,
    template: hokkaidoMainTemplate,
    sourceFilePath:
      "src/features/ammo-ledger/acquisition-permit-application/form-template/hokkaido-main/hokkaido-main-template.ts",
    supportsRepeatingRows: false,
  },
  {
    id: ibarakiR7SupplementTemplate.id,
    label: ibarakiR7SupplementTemplate.label,
    template: ibarakiR7SupplementTemplate,
    sourceFilePath:
      "src/features/ammo-ledger/acquisition-permit-application/form-template/ibaraki-r7-supplement/ibaraki-r7-supplement-template.ts",
    supportsRepeatingRows: true,
  },
];

export function findCalibrationTemplate({
  id,
}: {
  id: string;
}): CalibrationTemplateEntry | undefined {
  return calibrationTemplateRegistry.find((entry) => entry.id === id);
}
