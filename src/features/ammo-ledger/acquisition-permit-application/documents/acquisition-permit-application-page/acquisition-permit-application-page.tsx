import { Fragment } from "react";
import { cn } from "@/lib/cn";
import type { FormTemplate } from "../../form-template/form-template-types";
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
                    <OverlayField
                      key={`${rowKey}-${column.id}`}
                      field={{
                        id: `${rowKey}-${column.id}`,
                        page: pageIndex,
                        x: column.x,
                        y: y + (column.yOffset ?? 0),
                        width: column.width,
                        height: column.height,
                        fontSize: column.fontSize,
                        align: column.align,
                        verticalAlign: column.verticalAlign,
                        fitText: column.fitText,
                        variant: column.variant,
                      }}
                      value={row.values[column.id] ?? ""}
                      pageWidthMm={pageWidthMm}
                      pageHeightMm={pageHeightMm}
                    />
                  ))}
                </Fragment>
              );
            })
          : null}
      </div>
    </section>
  );
}
