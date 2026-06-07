import type { OverlayFieldDef } from "../form-template/form-template-types";

export type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const MIN_BOX_MM = 2;

function roundMm({ value }: { value: number }): number {
  return Math.round(value * 100) / 100;
}

export function applyFieldResize({
  field,
  direction,
  dx,
  dy,
}: {
  field: OverlayFieldDef;
  direction: ResizeDirection;
  dx: number;
  dy: number;
}): Partial<OverlayFieldDef> {
  const width = field.width ?? 30;
  const height = field.height ?? field.fontSize * 1.4;

  switch (direction) {
    case "se":
      return {
        width: roundMm({ value: Math.max(MIN_BOX_MM, width + dx) }),
        height: roundMm({ value: Math.max(MIN_BOX_MM, height + dy) }),
      };
    case "sw": {
      const nextWidth = Math.max(MIN_BOX_MM, width - dx);
      const consumedDx = width - nextWidth;
      return {
        x: roundMm({ value: field.x + consumedDx }),
        width: roundMm({ value: nextWidth }),
        height: roundMm({ value: Math.max(MIN_BOX_MM, height + dy) }),
      };
    }
    case "ne": {
      const nextHeight = Math.max(MIN_BOX_MM, height - dy);
      const consumedDy = height - nextHeight;
      return {
        y: roundMm({ value: field.y + consumedDy }),
        width: roundMm({ value: Math.max(MIN_BOX_MM, width + dx) }),
        height: roundMm({ value: nextHeight }),
      };
    }
    case "nw": {
      const nextWidth = Math.max(MIN_BOX_MM, width - dx);
      const nextHeight = Math.max(MIN_BOX_MM, height - dy);
      return {
        x: roundMm({ value: field.x + (width - nextWidth) }),
        y: roundMm({ value: field.y + (height - nextHeight) }),
        width: roundMm({ value: nextWidth }),
        height: roundMm({ value: nextHeight }),
      };
    }
    case "e":
      return { width: roundMm({ value: Math.max(MIN_BOX_MM, width + dx) }) };
    case "w": {
      const nextWidth = Math.max(MIN_BOX_MM, width - dx);
      return {
        x: roundMm({ value: field.x + (width - nextWidth) }),
        width: roundMm({ value: nextWidth }),
      };
    }
    case "s":
      return { height: roundMm({ value: Math.max(MIN_BOX_MM, height + dy) }) };
    case "n": {
      const nextHeight = Math.max(MIN_BOX_MM, height - dy);
      return {
        y: roundMm({ value: field.y + (height - nextHeight) }),
        height: roundMm({ value: nextHeight }),
      };
    }
  }
}
