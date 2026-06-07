"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { FieldAlign } from "../form-template/form-template-types";

const MIN_FONT_SIZE_MM = 1.4;
const FONT_STEP_MM = 0.05;

type AutoFitOverlayTextProps = {
  text: string;
  widthMm: number;
  heightMm: number;
  baseFontSizeMm: number;
  align?: FieldAlign;
  className?: string;
  singleLine?: boolean;
};

export function AutoFitOverlayText({
  text,
  widthMm: _widthMm,
  heightMm: _heightMm,
  baseFontSizeMm,
  align = "left",
  className,
  singleLine = false,
}: AutoFitOverlayTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fontSizeMm, setFontSizeMm] = useState(baseFontSizeMm);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !text) {
      setFontSizeMm(baseFontSizeMm);
      return;
    }

    let nextSize = baseFontSizeMm;
    element.style.fontSize = `${nextSize}mm`;
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

    setFontSizeMm(nextSize);
  }, [text, baseFontSizeMm, singleLine]);

  return (
    <span
      ref={ref}
      className={cn("block h-full w-full overflow-hidden", className)}
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
  );
}
