"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { buildOverlayVerticalLayoutStyle } from "../documents/overlay-field/build-overlay-mm-style";
import type { FieldAlign, FieldVerticalAlign } from "../form-template/form-template-types";

const MIN_FONT_SIZE_MM = 1.4;
const FONT_STEP_MM = 0.05;

type AutoFitOverlayTextProps = {
  text: string;
  widthMm: number;
  heightMm: number;
  baseFontSizeMm: number;
  align?: FieldAlign;
  verticalAlign?: FieldVerticalAlign;
  className?: string;
  singleLine?: boolean;
};

export function AutoFitOverlayText({
  text,
  widthMm: _widthMm,
  heightMm: _heightMm,
  baseFontSizeMm,
  align = "left",
  verticalAlign,
  className,
  singleLine = false,
}: AutoFitOverlayTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fontSizeMm, setFontSizeMm] = useState(baseFontSizeMm);
  const anchorTop = !verticalAlign || verticalAlign === "top";

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !text) {
      setFontSizeMm(baseFontSizeMm);
      return;
    }

    let nextSize = baseFontSizeMm;
    element.style.fontSize = `${nextSize}mm`;
    element.style.height = "100%";
    element.style.whiteSpace = singleLine ? "nowrap" : "pre-wrap";
    element.style.wordBreak = singleLine ? "normal" : "break-word";
    element.style.overflowWrap = singleLine ? "normal" : "anywhere";

    while (nextSize > MIN_FONT_SIZE_MM) {
      const overflowsHeight = element.scrollHeight - element.clientHeight > 1;
      const overflowsWidth = element.scrollWidth - element.clientWidth > 1;
      if (!overflowsHeight && !overflowsWidth) {
        break;
      }
      nextSize = Math.round((nextSize - FONT_STEP_MM) * 100) / 100;
      element.style.fontSize = `${nextSize}mm`;
    }

    element.style.height = anchorTop ? "100%" : "auto";
    setFontSizeMm(nextSize);
  }, [anchorTop, text, baseFontSizeMm, singleLine]);

  return (
    <span style={buildOverlayVerticalLayoutStyle({ verticalAlign })}>
      <span
        ref={ref}
        className={cn(
          "block w-full overflow-hidden",
          anchorTop ? "h-full" : "max-h-full shrink-0",
          className,
        )}
        style={{
          fontSize: `${fontSizeMm}mm`,
          lineHeight: 1.2,
          textAlign: align,
          whiteSpace: singleLine ? "nowrap" : "pre-wrap",
          wordBreak: singleLine ? "normal" : "break-word",
          overflowWrap: singleLine ? "normal" : "anywhere",
          fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", "MS PMincho", serif',
        }}
      >
        {text}
      </span>
    </span>
  );
}
