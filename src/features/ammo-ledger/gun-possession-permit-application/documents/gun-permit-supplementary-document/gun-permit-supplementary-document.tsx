import { AcquisitionPermitApplicationPage } from "@/features/ammo-ledger/acquisition-permit-application/documents/acquisition-permit-application-page/acquisition-permit-application-page";
import type { BuiltSupplementaryFieldValues } from "../../build-supplementary-field-values/build-supplementary-field-values";
import { hokkaidoForm13Template } from "../../form-template/hokkaido-form13/hokkaido-form13-template";
import { hokkaidoResumeTemplate } from "../../form-template/hokkaido-resume/hokkaido-resume-template";

type GunPermitSupplementaryDocumentProps = {
  supplementary: BuiltSupplementaryFieldValues;
};

export function GunPermitSupplementaryDocument({
  supplementary,
}: GunPermitSupplementaryDocumentProps) {
  const hasResume =
    supplementary.resumeWorkRows.length > 0 || supplementary.resumeAddressRows.length > 0;
  const hasCohabitants = supplementary.cohabitantRows.length > 0;

  return (
    <div className="application-form-supplementary-attachments space-y-0">
      {hasResume ? (
        <div className="application-form-resume">
          <AcquisitionPermitApplicationPage
            template={hokkaidoResumeTemplate}
            pageIndex={0}
            fieldValues={supplementary.resumeMainFields}
            supplementRows={supplementary.resumeWorkRows}
            pageVariant="supplement"
          />
          <AcquisitionPermitApplicationPage
            template={hokkaidoResumeTemplate}
            pageIndex={1}
            fieldValues={supplementary.resumeMainFields}
            supplementRows={supplementary.resumeAddressRows}
            pageVariant="supplement"
          />
        </div>
      ) : null}

      {hasCohabitants ? (
        <div className="application-form-cohabitants">
          <AcquisitionPermitApplicationPage
            template={hokkaidoForm13Template}
            pageIndex={0}
            fieldValues={supplementary.cohabitantMainFields}
            supplementRows={supplementary.cohabitantRows}
            pageVariant="supplement"
          />
        </div>
      ) : null}
    </div>
  );
}
