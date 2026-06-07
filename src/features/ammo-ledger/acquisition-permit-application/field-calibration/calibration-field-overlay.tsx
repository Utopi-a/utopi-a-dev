"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/cn";
import {
  buildOverlayMmStyle,
  buildOverlayVerticalLayoutStyle,
} from "../documents/overlay-field/build-overlay-mm-style";
import { AutoFitOverlayText } from "../fit-text-to-box/auto-fit-overlay-text";
import {
  resolveOverlayFieldBox,
  shouldAutoFitOverlayField,
} from "../fit-text-to-box/resolve-overlay-field-box";
import type { OverlayFieldDef } from "../form-template/form-template-types";
import { applyFieldResize, type ResizeDirection } from "./apply-field-resize";
import { CalibrationFieldResizeHandles } from "./calibration-field-resize-handles";

type CalibrationFieldOverlayProps = {
  field: OverlayFieldDef;
  value: string;
  pageWidthMm: number;
  pageHeightMm: number;
  isSelected: boolean;
  isPrimary: boolean;
  isRepeatingRowColumn?: boolean;
  onMakePrimary: () => void;
  onPrepareDrag: ({ additive }: { additive: boolean }) => boolean;
  onDragMove: ({ dx, dy }: { dx: number; dy: number }) => void;
  onDragEnd: () => void;
  onFieldChange: ({ patch }: { patch: Partial<OverlayFieldDef> }) => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
};

export function CalibrationFieldOverlay({
  field,
  value,
  pageWidthMm,
  pageHeightMm,
  isSelected,
  isPrimary,
  isRepeatingRowColumn = false,
  onMakePrimary,
  onPrepareDrag,
  onDragMove,
  onDragEnd,
  onFieldChange,
  onInteractionStart,
  onInteractionEnd,
}: CalibrationFieldOverlayProps) {
  const displayValue = value || field.id;
  const isCheckbox = field.variant === "checkbox";
  const { width, height } = resolveOverlayFieldBox({ field });
  const useAutoFit = shouldAutoFitOverlayField({ field });
  const singleLine = height <= field.fontSize * 1.35;

  function getMmPerPx(pageElement: Element) {
    const pageRect = pageElement.getBoundingClientRect();
    return {
      mmPerPxX: pageWidthMm / pageRect.width,
      mmPerPxY: pageHeightMm / pageRect.height,
    };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-resize-handle='true']")) {
      return;
    }

    event.preventDefault();

    const shouldDrag = onPrepareDrag({
      additive: event.metaKey || event.ctrlKey,
    });
    if (!shouldDrag) {
      return;
    }

    const pageElement = event.currentTarget.closest("[data-calibration-page]");
    if (!pageElement) {
      return;
    }

    const { mmPerPxX, mmPerPxY } = getMmPerPx(pageElement);
    const startX = event.clientX;
    const startY = event.clientY;

    function handlePointerMove(moveEvent: PointerEvent) {
      const dx = (moveEvent.clientX - startX) * mmPerPxX;
      const dy = (moveEvent.clientY - startY) * mmPerPxY;
      onDragMove({ dx, dy });
      moveEvent.preventDefault();
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      onDragEnd();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handleResizeStart({
    direction,
    event,
  }: {
    direction: ResizeDirection;
    event: ReactPointerEvent<HTMLButtonElement>;
  }) {
    onMakePrimary();

    const pageElement = event.currentTarget.closest("[data-calibration-page]");
    if (!pageElement) {
      return;
    }

    const { mmPerPxX, mmPerPxY } = getMmPerPx(pageElement);
    const startX = event.clientX;
    const startY = event.clientY;
    const originField = { ...field, width, height };

    onInteractionStart();

    function handlePointerMove(moveEvent: PointerEvent) {
      const dx = (moveEvent.clientX - startX) * mmPerPxX;
      const dy = (moveEvent.clientY - startY) * mmPerPxY;
      const patch = applyFieldResize({
        field: originField,
        direction,
        dx,
        dy,
      });
      onFieldChange({ patch });
      moveEvent.preventDefault();
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      onInteractionEnd();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <div
      className={cn(
        "absolute z-10 box-border cursor-move border text-left",
        isPrimary
          ? "border-blue-600 bg-blue-500/10 ring-1 ring-blue-600"
          : isSelected
            ? isRepeatingRowColumn
              ? "border-violet-600 bg-violet-500/10 ring-1 ring-violet-500 ring-dashed"
              : "border-blue-500 bg-blue-500/5 ring-1 ring-blue-400 ring-dashed"
            : isRepeatingRowColumn
              ? "border-violet-400/80 bg-violet-400/5"
              : "border-orange-400/80 bg-orange-400/5",
        isCheckbox && "flex items-center justify-center",
      )}
      style={buildOverlayMmStyle({
        x: field.x,
        y: field.y,
        width,
        height,
        fontSize: field.fontSize,
        align: field.align,
        pageWidthMm,
        pageHeightMm,
      })}
      onPointerDown={handlePointerDown}
      title={field.id}
    >
      {useAutoFit ? (
        <AutoFitOverlayText
          text={displayValue}
          widthMm={width}
          heightMm={height}
          baseFontSizeMm={field.fontSize}
          align={field.align}
          verticalAlign={field.verticalAlign}
          singleLine={singleLine}
          className={cn(!value && "text-orange-700/70")}
        />
      ) : (
        <span style={buildOverlayVerticalLayoutStyle({ verticalAlign: field.verticalAlign })}>
          <span
            className={cn(
              "pointer-events-none block max-h-full w-full shrink-0 overflow-hidden text-black",
              isCheckbox && "flex items-center justify-center leading-none",
              !value && "text-orange-700/70",
            )}
            style={{
              fontSize: `${field.fontSize}mm`,
              fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", "MS PMincho", serif',
              lineHeight: isCheckbox ? 1 : 1.2,
              textAlign: field.align ?? "left",
              whiteSpace: "pre-wrap",
            }}
          >
            {displayValue}
          </span>
        </span>
      )}

      {isPrimary ? <CalibrationFieldResizeHandles onResizeStart={handleResizeStart} /> : null}
    </div>
  );
}
