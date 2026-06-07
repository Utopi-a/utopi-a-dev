import type { BuiltApplicationFieldValues } from "../../build-application-field-values/build-application-field-values";
import { ibarakiR7MainTemplate } from "../../form-template/ibaraki-r7-main/ibaraki-r7-main-template";
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
          公式様式（茨城県警・令和7年3月改定）の背景に入力値を重ねて表示します。印刷時は倍率
          100%・A4 白無地で出力してください。署名・押印欄は手書きで記入してください。
        </p>
        <p>
          別紙 {supplementPages.length} 枚（計 {fieldValues.supplementRows.length}{" "}
          行）。座標は初期キャリブレーション値のため、実機でずれがあれば調整が必要です。
        </p>
      </div>

      <AcquisitionPermitApplicationPage
        template={ibarakiR7MainTemplate}
        pageIndex={0}
        fieldValues={fieldValues.mainFields}
      />

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
        />
      ))}
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
