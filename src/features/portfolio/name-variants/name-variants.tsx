"use client";

import { useState } from "react";

type NameVariantsProps = {
  variants: readonly string[];
};

/** 名前を押すたびに表記を巡らせる。見出しの読み上げは現在の表記になる */
export function NameVariants({ variants }: NameVariantsProps) {
  const [index, setIndex] = useState(0);

  const showNext = () => {
    const next = () => setIndex((current) => (current + 1) % variants.length);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduceMotion) {
      next();
      return;
    }
    // 画面が非表示などで演出だけが中断されても、表記の切り替えは完了している
    document.startViewTransition(next).ready.catch(() => {});
  };

  return (
    <button type="button" className="pf-name-button" onClick={showNext}>
      {variants[index]}
    </button>
  );
}
