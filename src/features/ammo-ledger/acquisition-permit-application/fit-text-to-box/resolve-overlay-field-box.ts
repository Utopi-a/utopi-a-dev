import type { OverlayFieldDef } from "../form-template/form-template-types";

export function resolveOverlayFieldBox({ field }: { field: OverlayFieldDef }): {
  width: number;
  height: number;
} {
  return {
    width: field.width ?? 30,
    height: field.height ?? field.fontSize * 1.4,
  };
}

export function shouldAutoFitOverlayField({ field }: { field: OverlayFieldDef }): boolean {
  if (field.variant === "checkbox") {
    return false;
  }
  if (field.fitText === false) {
    return false;
  }
  return field.width !== undefined;
}
