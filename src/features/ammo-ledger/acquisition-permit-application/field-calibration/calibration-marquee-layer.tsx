"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useState } from "react";
import type { OverlayFieldDef } from "../form-template/form-template-types";
import { selectFieldIdsInMarquee } from "./duplicate-calibration-fields";

type MarqueeRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type CalibrationMarqueeLayerProps = {
  pageWidthMm: number;
  pageHeightMm: number;
  pageFields: OverlayFieldDef[];
  onSelectFields: ({ fieldIds, additive }: { fieldIds: string[]; additive: boolean }) => void;
};

function getMmPerPx({
  pageElement,
  pageWidthMm,
  pageHeightMm,
}: {
  pageElement: Element;
  pageWidthMm: number;
  pageHeightMm: number;
}) {
  const pageRect = pageElement.getBoundingClientRect();
  return {
    mmPerPxX: pageWidthMm / pageRect.width,
    mmPerPxY: pageHeightMm / pageRect.height,
  };
}

export function CalibrationMarqueeLayer({
  pageWidthMm,
  pageHeightMm,
  pageFields,
  onSelectFields,
}: CalibrationMarqueeLayerProps) {
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }

    event.preventDefault();
    const pageElement = event.currentTarget.closest("[data-calibration-page]");
    if (!pageElement) {
      return;
    }

    const { mmPerPxX, mmPerPxY } = getMmPerPx({ pageElement, pageWidthMm, pageHeightMm });
    const pageRect = pageElement.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const originLeft = (startX - pageRect.left) * mmPerPxX;
    const originTop = (startY - pageRect.top) * mmPerPxY;

    function handlePointerMove(moveEvent: PointerEvent) {
      const currentLeft = (moveEvent.clientX - pageRect.left) * mmPerPxX;
      const currentTop = (moveEvent.clientY - pageRect.top) * mmPerPxY;
      setMarquee({
        left: Math.min(originLeft, currentLeft),
        top: Math.min(originTop, currentTop),
        right: Math.max(originLeft, currentLeft),
        bottom: Math.max(originTop, currentTop),
      });
      moveEvent.preventDefault();
    }

    function handlePointerUp(moveEvent: PointerEvent) {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      const currentLeft = (moveEvent.clientX - pageRect.left) * mmPerPxX;
      const currentTop = (moveEvent.clientY - pageRect.top) * mmPerPxY;
      const rect = {
        left: Math.min(originLeft, currentLeft),
        top: Math.min(originTop, currentTop),
        right: Math.max(originLeft, currentLeft),
        bottom: Math.max(originTop, currentTop),
      };
      setMarquee(null);

      const draggedEnough =
        Math.abs(rect.right - rect.left) > 0.5 || Math.abs(rect.bottom - rect.top) > 0.5;
      if (!draggedEnough) {
        if (!(moveEvent.metaKey || moveEvent.ctrlKey)) {
          onSelectFields({ fieldIds: [], additive: false });
        }
        return;
      }

      onSelectFields({
        fieldIds: selectFieldIdsInMarquee({ fields: pageFields, marquee: rect }),
        additive: moveEvent.metaKey || moveEvent.ctrlKey,
      });
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <div className="absolute inset-0 z-0" onPointerDown={handlePointerDown}>
      {marquee ? (
        <div
          className="pointer-events-none absolute border border-blue-500 bg-blue-400/10"
          style={{
            left: `${(marquee.left / pageWidthMm) * 100}%`,
            top: `${(marquee.top / pageHeightMm) * 100}%`,
            width: `${((marquee.right - marquee.left) / pageWidthMm) * 100}%`,
            height: `${((marquee.bottom - marquee.top) / pageHeightMm) * 100}%`,
          }}
        />
      ) : null}
    </div>
  );
}
