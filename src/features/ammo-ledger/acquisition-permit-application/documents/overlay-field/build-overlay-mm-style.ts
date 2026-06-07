import type { CSSProperties } from "react";
import type { FieldAlign } from "../../form-template/form-template-types";

function mmToWidthPercent({ value, pageWidthMm }: { value: number; pageWidthMm: number }): string {
  return `${(value / pageWidthMm) * 100}%`;
}

function mmToHeightPercent({
  value,
  pageHeightMm,
}: {
  value: number;
  pageHeightMm: number;
}): string {
  return `${(value / pageHeightMm) * 100}%`;
}

export function buildOverlayMmStyle({
  x,
  y,
  width,
  height,
  fontSize,
  align,
  pageWidthMm,
  pageHeightMm,
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize: number;
  align?: FieldAlign;
  pageWidthMm: number;
  pageHeightMm: number;
}): CSSProperties {
  return {
    left: mmToWidthPercent({ value: x, pageWidthMm }),
    top: mmToHeightPercent({ value: y, pageHeightMm }),
    width: width ? mmToWidthPercent({ value: width, pageWidthMm }) : undefined,
    height: height ? mmToHeightPercent({ value: height, pageHeightMm }) : undefined,
    fontSize: `${fontSize}mm`,
    textAlign: align ?? "left",
  };
}
