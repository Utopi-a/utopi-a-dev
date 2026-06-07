import type { BuiltApplicationFieldValues } from "../../build-application-field-values/build-application-field-values";
import { hokkaidoMainTemplate } from "../../form-template/hokkaido-main/hokkaido-main-template";
import { ibarakiR7SupplementTemplate } from "../../form-template/ibaraki-r7-supplement/ibaraki-r7-supplement-template";
import { AcquisitionPermitApplicationPage } from "../acquisition-permit-application-page/acquisition-permit-application-page";
import { AcquisitionPermitApplicationStyles } from "../acquisition-permit-application-styles/acquisition-permit-application-styles";

type AcquisitionPermitApplicationDocumentProps = {
  fieldValues: BuiltApplicationFieldValues;
};

export function AcquisitionPermitApplicationDocument({
  fieldValues,
}: AcquisitionPermitApplicationDocumentProps) {
  const rowsPerPage = ibarakiR7SupplementTemplate.repeatingRows?.maxRowsPerPage ?? 10;
  const supplementPages = chunkSupplementRows({
    rows: fieldValues.supplementRows,
    rowsPerPage,
  });

  return (
    <div className="application-form-print">
      <AcquisitionPermitApplicationStyles />

      <div className="no-print mb-4 space-y-2 text-sm text-muted-foreground">
        <p>
          申請書は表（入力あり）・裏（記載例）の2ページです。「申請書を印刷」は表裏両面、別紙は1枚ずつ片面で印刷してください。
        </p>
        <p>
          倍率 100%・余白なし・ヘッダー/フッター OFF・A4
          白無地。署名・押印欄は手書きで記入してください。
        </p>
        <p>
          別紙 {supplementPages.length} 枚（計 {fieldValues.supplementRows.length} 行）。
        </p>
      </div>

      <div className="application-form-main">
        {hokkaidoMainTemplate.pages.map((page, pageIndex) => (
          <AcquisitionPermitApplicationPage
            key={`main-page-${page.imagePath}`}
            template={hokkaidoMainTemplate}
            pageIndex={pageIndex}
            fieldValues={fieldValues.mainFields}
            pageVariant={pageIndex === 0 ? "main-front" : "main-back"}
          />
        ))}
      </div>

      <div className="application-form-supplement">
        {supplementPages.map((pageRows, pageIndex) => (
          <AcquisitionPermitApplicationPage
            key={`supplement-page-${pageRows[0]?.rowIndex ?? pageIndex}`}
            template={ibarakiR7SupplementTemplate}
            pageIndex={0}
            fieldValues={{
              planPurposeLabel: fieldValues.mainFields.permitPurpose ?? "",
            }}
            supplementRows={pageRows}
            supplementPageOffset={0}
            pageVariant="supplement"
          />
        ))}
      </div>
    </div>
  );
}

function chunkSupplementRows({
  rows,
  rowsPerPage,
}: {
  rows: BuiltApplicationFieldValues["supplementRows"];
  rowsPerPage: number;
}) {
  const pages: Array<typeof rows> = [];
  for (let index = 0; index < rows.length; index += rowsPerPage) {
    pages.push(rows.slice(index, index + rowsPerPage));
  }
  if (pages.length === 0) {
    pages.push([]);
  }
  return pages;
}
