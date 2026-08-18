import { AcquisitionPermitApplicationPage } from "@/features/ammo-ledger/acquisition-permit-application/documents/acquisition-permit-application-page/acquisition-permit-application-page";
import type { BuiltGunPermitFieldValues } from "../../build-field-values/build-field-values";
import { hokkaidoForm6MainTemplate } from "../../form-template/hokkaido-form6-main/hokkaido-form6-main-template";
import { hokkaidoForm6SupplementTemplate } from "../../form-template/hokkaido-form6-supplement/hokkaido-form6-supplement-template";
import { hokkaidoForm9MainTemplate } from "../../form-template/hokkaido-form9-main/hokkaido-form9-main-template";
import { hokkaidoForm9SupplementTemplate } from "../../form-template/hokkaido-form9-supplement/hokkaido-form9-supplement-template";
import type { GunPermitApplicationKind } from "../../gun-possession-permit-application-types";

type GunPermitApplicationDocumentProps = {
  kind: GunPermitApplicationKind;
  fieldValues: BuiltGunPermitFieldValues;
};

export function GunPermitApplicationDocument({
  kind,
  fieldValues,
}: GunPermitApplicationDocumentProps) {
  const isRenewal = kind === "renewal";
  const mainTemplate = isRenewal ? hokkaidoForm9MainTemplate : hokkaidoForm6MainTemplate;

  return (
    <>
      <div className="no-print mb-4 space-y-2 text-sm text-muted-foreground">
        <p>
          {isRenewal
            ? "更新申請書（様式第9号）と別紙を 100%・A4 白無地で印刷してください。"
            : "所持許可申請書（様式第6号）本体・別紙を 100%・A4 白無地で印刷してください。"}
        </p>
        <p>署名・押印欄は手書きで記入してください。座標はキャリブレーション前の初期値です。</p>
        {!isRenewal ? (
          <p>別紙 {fieldValues.supplementGunPages.length} セット（申請銃ごとに表裏・両面印刷）。</p>
        ) : (
          <p>別紙 更新対象銃 {fieldValues.renewalSupplementRows.length} 件（片面1枚）。</p>
        )}
      </div>

      <div className="application-form-main">
        {mainTemplate.pages.map((page, pageIndex) => (
          <AcquisitionPermitApplicationPage
            key={page.imagePath}
            template={mainTemplate}
            pageIndex={pageIndex}
            fieldValues={fieldValues.mainFields}
            pageVariant={pageIndex === 0 ? "main-front" : "main-back"}
          />
        ))}
      </div>

      <div className="application-form-supplement">
        {isRenewal ? (
          <AcquisitionPermitApplicationPage
            template={hokkaidoForm9SupplementTemplate}
            pageIndex={0}
            fieldValues={{}}
            supplementRows={fieldValues.renewalSupplementRows}
            pageVariant="supplement"
          />
        ) : (
          fieldValues.supplementGunPages.map((gunPage) => (
            <div key={`gun-supplement-${gunPage.gunIndex}`}>
              {hokkaidoForm6SupplementTemplate.pages.map((page, pageIndex) => (
                <AcquisitionPermitApplicationPage
                  key={`gun-${gunPage.gunIndex}-page-${page.imagePath}`}
                  template={hokkaidoForm6SupplementTemplate}
                  pageIndex={pageIndex}
                  fieldValues={pageIndex === 0 ? gunPage.frontFields : gunPage.backFields}
                  pageVariant="supplement"
                />
              ))}
            </div>
          ))
        )}
      </div>
    </>
  );
}
