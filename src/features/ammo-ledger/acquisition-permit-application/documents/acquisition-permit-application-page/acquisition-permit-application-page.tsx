import { Fragment } from "react";
import { cn } from "@/lib/cn";
import type { FormTemplate } from "../../form-template/form-template-types";
import { buildOverlayMmStyle } from "../overlay-field/build-overlay-mm-style";
import { OverlayField } from "../overlay-field/overlay-field";

type ApplicationPageVariant = "main-front" | "main-back" | "supplement";

type AcquisitionPermitApplicationPageProps = {
  template: FormTemplate;
  pageIndex: number;
  fieldValues: Record<string, string>;
  supplementRows?: Array<{ rowIndex?: number; values: Record<string, string> }>;
  supplementPageOffset?: number;
  pageVariant?: ApplicationPageVariant;
};

export function AcquisitionPermitApplicationPage({
  template,
  pageIndex,
  fieldValues,
  supplementRows = [],
  supplementPageOffset = 0,
  pageVariant,
}: AcquisitionPermitApplicationPageProps) {
  const page = template.pages[pageIndex];
  const pageFields = template.fields.filter((field) => field.page === pageIndex);
  const repeatingRows = template.repeatingRows;
  const { pageWidthMm, pageHeightMm } = template;

  return (
    <section
      className={cn(
        "application-form-page",
        pageVariant && `application-form-page--${pageVariant}`,
      )}
      style={{
        width: `${pageWidthMm}mm`,
        height: `${pageHeightMm}mm`,
        backgroundImage: `url(${page.imagePath})`,
      }}
    >
      <div className="application-form-page__overlay">
        {pageFields.map((field) => (
          <OverlayField
            key={field.id}
            field={field}
            value={fieldValues[field.id] ?? ""}
            pageWidthMm={pageWidthMm}
            pageHeightMm={pageHeightMm}
          />
        ))}

        {repeatingRows
          ? supplementRows.map((row, index) => {
              const rowNumber = supplementPageOffset + index;
              if (rowNumber >= repeatingRows.maxRowsPerPage) {
                return null;
              }

              const y = repeatingRows.startY + rowNumber * repeatingRows.rowHeight;
              const rowKey =
                row.rowIndex ??
                `${rowNumber}-${row.values.year ?? ""}-${row.values.month ?? ""}-${row.values.period ?? index}`;

              return (
                <Fragment key={rowKey}>
                  {repeatingRows.columns.map((column) => (
                    <span
                      key={`${rowKey}-${column.id}`}
                      className="application-overlay-field"
                      style={buildOverlayMmStyle({
                        x: column.x,
                        y: y + (column.yOffset ?? 0),
                        width: column.width,
                        fontSize: column.fontSize,
                        align: column.align,
                        pageWidthMm,
                        pageHeightMm,
                      })}
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
