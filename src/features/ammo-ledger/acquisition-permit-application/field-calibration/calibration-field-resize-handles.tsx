"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { ResizeDirection } from "./apply-field-resize";

const HANDLES: Array<{ direction: ResizeDirection; className: string }> = [
  {
    direction: "nw",
    className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
  },
  {
    direction: "n",
    className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
  },
  {
    direction: "ne",
    className: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  },
  {
    direction: "e",
    className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  },
  {
    direction: "se",
    className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
  },
  {
    direction: "s",
    className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
  },
  {
    direction: "sw",
    className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
  },
  {
    direction: "w",
    className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  },
];

type CalibrationFieldResizeHandlesProps = {
  onResizeStart: ({
    direction,
    event,
  }: {
    direction: ResizeDirection;
    event: ReactPointerEvent<HTMLButtonElement>;
  }) => void;
};

export function CalibrationFieldResizeHandles({
  onResizeStart,
}: CalibrationFieldResizeHandlesProps) {
  return (
    <>
      {HANDLES.map(({ direction, className }) => (
        <button
          key={direction}
          type="button"
          data-resize-handle="true"
          aria-label={`${direction} resize`}
          className={`absolute z-10 h-2.5 w-2.5 rounded-full border border-blue-600 bg-white p-0 ${className}`}
          onPointerDown={(event) => {
            event.stopPropagation();
            event.preventDefault();
            onResizeStart({ direction, event });
          }}
        />
      ))}
    </>
  );
}
