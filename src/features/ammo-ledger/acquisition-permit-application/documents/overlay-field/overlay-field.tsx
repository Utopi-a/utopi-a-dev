import { AutoFitOverlayText } from "../../fit-text-to-box/auto-fit-overlay-text";
import {
  resolveOverlayFieldBox,
  shouldAutoFitOverlayField,
} from "../../fit-text-to-box/resolve-overlay-field-box";
import type { OverlayFieldDef } from "../../form-template/form-template-types";
import { buildOverlayMmStyle } from "./build-overlay-mm-style";

type OverlayFieldProps = {
  field: OverlayFieldDef;
  value: string;
  pageWidthMm: number;
  pageHeightMm: number;
};

export function OverlayField({ field, value, pageWidthMm, pageHeightMm }: OverlayFieldProps) {
  if (!value) {
    return null;
  }

  const isCheckbox = field.variant === "checkbox";
  const { width, height } = resolveOverlayFieldBox({ field });
  const useAutoFit = shouldAutoFitOverlayField({ field });
  const singleLine = height <= field.fontSize * 1.35;

  return (
    <span
      className={
        isCheckbox
          ? "application-overlay-field application-overlay-field--checkbox"
          : "application-overlay-field"
      }
      style={buildOverlayMmStyle({
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height ?? (useAutoFit ? height : undefined),
        fontSize: field.fontSize,
        align: field.align,
        pageWidthMm,
        pageHeightMm,
      })}
    >
      {useAutoFit ? (
        <AutoFitOverlayText
          text={value}
          widthMm={width}
          heightMm={height}
          baseFontSizeMm={field.fontSize}
          align={field.align}
          singleLine={singleLine}
        />
      ) : (
        value
      )}
    </span>
  );
}
