import { Fragment } from "react";
import type { FormTemplate } from "../../form-template/form-template-types";
import { OverlayField } from "../overlay-field/overlay-field";

type AcquisitionPermitApplicationPageProps = {
  template: FormTemplate;
  pageIndex: number;
  fieldValues: Record<string, string>;
  supplementRows?: Array<{ rowIndex?: number; values: Record<string, string> }>;
  supplementPageOffset?: number;
};

export function AcquisitionPermitApplicationPage({
  template,
  pageIndex,
  fieldValues,
  supplementRows = [],
  supplementPageOffset = 0,
}: AcquisitionPermitApplicationPageProps) {
  const page = template.pages[pageIndex];
  const pageFields = template.fields.filter((field) => field.page === pageIndex);
  const repeatingRows = template.repeatingRows;

  return (
    <section
      className="application-form-page"
      style={{
        width: `${template.pageWidthMm}mm`,
        height: `${template.pageHeightMm}mm`,
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: 印刷用テンプレート背景 */}
      <img
        src={page.imagePath}
        alt=""
        className="application-form-page__background"
        draggable={false}
      />

      <div className="application-form-page__overlay">
        {pageFields.map((field) => (
          <OverlayField key={field.id} field={field} value={fieldValues[field.id] ?? ""} />
        ))}

        {repeatingRows
          ? supplementRows.map((row, index) => {
              const rowNumber = supplementPageOffset + index;
              if (rowNumber >= repeatingRows.maxRowsPerPage) {
                return null;
              }

              const y = repeatingRows.startY + rowNumber * repeatingRows.rowHeight;
              const rowKey = row.rowIndex ?? `${rowNumber}-${row.values.date ?? index}`;

              return (
                <Fragment key={rowKey}>
                  {repeatingRows.columns.map((column) => (
                    <span
                      key={`${rowKey}-${column.id}`}
                      className="application-overlay-field"
                      style={{
                        left: `${column.x}mm`,
                        top: `${y}mm`,
                        width: `${column.width}mm`,
                        fontSize: `${column.fontSize}mm`,
                        textAlign: column.align ?? "left",
                      }}
                    >
                      {row.values[column.id] ?? ""}
                    </span>
                  ))}
                </Fragment>
              );
            })
          : null}
      </div>
    </section>
  );
}
