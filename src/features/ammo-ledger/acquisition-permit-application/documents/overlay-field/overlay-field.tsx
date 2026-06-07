import type { FieldAlign, OverlayFieldDef } from "../../form-template/form-template-types";

type OverlayFieldProps = {
  field: OverlayFieldDef;
  value: string;
};

export function OverlayField({ field, value }: OverlayFieldProps) {
  if (!value) {
    return null;
  }

  return (
    <span
      className="application-overlay-field"
      style={{
        left: `${field.x}mm`,
        top: `${field.y}mm`,
        width: field.width ? `${field.width}mm` : undefined,
        height: field.height ? `${field.height}mm` : undefined,
        fontSize: `${field.fontSize}mm`,
        textAlign: field.align ?? "left",
      }}
    >
      {value}
    </span>
  );
}

export type { FieldAlign };
