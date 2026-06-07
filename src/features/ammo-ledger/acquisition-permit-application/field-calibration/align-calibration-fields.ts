import { resolveOverlayFieldBox } from "../fit-text-to-box/resolve-overlay-field-box";
import type { OverlayFieldDef } from "../form-template/form-template-types";

export type AlignMode =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom"
  | "distribute-horizontal"
  | "distribute-vertical";

function roundMm({ value }: { value: number }): number {
  return Math.round(value * 100) / 100;
}

function getBox({ field }: { field: OverlayFieldDef }) {
  const { width, height } = resolveOverlayFieldBox({ field });
  return {
    x: field.x,
    y: field.y,
    width,
    height,
  };
}

function applyPatches({
  fields,
  patches,
}: {
  fields: OverlayFieldDef[];
  patches: Array<{ id: string; x?: number; y?: number }>;
}): OverlayFieldDef[] {
  const patchMap = new Map(patches.map((patch) => [patch.id, patch]));

  return fields.map((field) => {
    const patch = patchMap.get(field.id);
    if (!patch) {
      return field;
    }
    return {
      ...field,
      ...(patch.x !== undefined ? { x: patch.x } : {}),
      ...(patch.y !== undefined ? { y: patch.y } : {}),
    };
  });
}

export function alignCalibrationFields({
  fields,
  selectedIds,
  mode,
}: {
  fields: OverlayFieldDef[];
  selectedIds: string[];
  mode: AlignMode;
}): OverlayFieldDef[] {
  const selected = fields.filter((field) => selectedIds.includes(field.id));
  if (selected.length < 2) {
    return fields;
  }

  const boxes = selected.map((field) => ({
    field,
    box: getBox({ field }),
  }));

  const minX = Math.min(...boxes.map(({ box }) => box.x));
  const maxX = Math.max(...boxes.map(({ box }) => box.x + box.width));
  const minY = Math.min(...boxes.map(({ box }) => box.y));
  const maxY = Math.max(...boxes.map(({ box }) => box.y + box.height));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  switch (mode) {
    case "left":
      return applyPatches({
        fields,
        patches: boxes.map(({ field, box }) => ({
          id: field.id,
          x: roundMm({ value: minX }),
          y: box.y,
        })),
      });
    case "right":
      return applyPatches({
        fields,
        patches: boxes.map(({ field, box }) => ({
          id: field.id,
          x: roundMm({ value: maxX - box.width }),
        })),
      });
    case "center":
      return applyPatches({
        fields,
        patches: boxes.map(({ field, box }) => ({
          id: field.id,
          x: roundMm({ value: centerX - box.width / 2 }),
        })),
      });
    case "top":
      return applyPatches({
        fields,
        patches: boxes.map(({ field }) => ({
          id: field.id,
          y: roundMm({ value: minY }),
        })),
      });
    case "bottom":
      return applyPatches({
        fields,
        patches: boxes.map(({ field, box }) => ({
          id: field.id,
          y: roundMm({ value: maxY - box.height }),
        })),
      });
    case "middle":
      return applyPatches({
        fields,
        patches: boxes.map(({ field, box }) => ({
          id: field.id,
          y: roundMm({ value: centerY - box.height / 2 }),
        })),
      });
    case "distribute-horizontal": {
      if (boxes.length < 3) {
        return fields;
      }
      const sorted = [...boxes].sort((a, b) => a.box.x - b.box.x);
      const firstX = sorted[0].box.x;
      const lastX = sorted[sorted.length - 1].box.x;
      const step = (lastX - firstX) / (sorted.length - 1);
      return applyPatches({
        fields,
        patches: sorted.map(({ field }, index) => ({
          id: field.id,
          x: roundMm({ value: firstX + step * index }),
        })),
      });
    }
    case "distribute-vertical": {
      if (boxes.length < 3) {
        return fields;
      }
      const sorted = [...boxes].sort((a, b) => a.box.y - b.box.y);
      const firstY = sorted[0].box.y;
      const lastY = sorted[sorted.length - 1].box.y;
      const step = (lastY - firstY) / (sorted.length - 1);
      return applyPatches({
        fields,
        patches: sorted.map(({ field }, index) => ({
          id: field.id,
          y: roundMm({ value: firstY + step * index }),
        })),
      });
    }
  }
}
