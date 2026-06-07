"use client";

import { type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from "react";
import { PrefectureJumpNav } from "@/features/ammo-ledger/components/prefecture-jump-nav/prefecture-jump-nav";
import { cn } from "@/lib/cn";

type CatalogScrollPaneProps = {
  scrollRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  showPrefectureRail: boolean;
  prefectures: string[];
  onJumpPrefecture: ({ prefecture }: { prefecture: string }) => void;
  expandToViewport?: boolean;
  className?: string;
};

export function CatalogScrollPane({
  scrollRef,
  children,
  showPrefectureRail,
  prefectures,
  onJumpPrefecture,
  expandToViewport = false,
  className,
}: CatalogScrollPaneProps) {
  const paneRef = useRef<HTMLDivElement>(null);
  const [paneHeight, setPaneHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!expandToViewport) {
      return;
    }

    function measure() {
      const pane = paneRef.current;
      if (!pane) {
        return;
      }

      const top = pane.getBoundingClientRect().top;
      const viewport = window.visualViewport?.height ?? window.innerHeight;
      setPaneHeight(Math.max(240, viewport - top));
    }

    measure();

    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [expandToViewport]);

  const paneStyle =
    expandToViewport && paneHeight != null ? { height: `${paneHeight}px` } : undefined;
  const embeddedClass = expandToViewport ? undefined : "min-h-0 flex-1";

  if (!showPrefectureRail) {
    return (
      <div
        ref={(node) => {
          paneRef.current = node;
          scrollRef.current = node;
        }}
        style={paneStyle}
        className={cn(
          "overflow-y-auto overscroll-contain catalog-scroll-list",
          embeddedClass,
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={paneRef}
      style={paneStyle}
      className={cn("grid grid-cols-[1fr_4.75rem] overflow-hidden", embeddedClass, className)}
    >
      <div
        ref={scrollRef}
        className="min-h-0 overflow-y-auto overscroll-contain catalog-scroll-list"
      >
        {children}
      </div>
      <aside className="min-h-0 overflow-hidden border-l border-border/50 bg-muted/25">
        <PrefectureJumpNav prefectures={prefectures} onJump={onJumpPrefecture} />
      </aside>
    </div>
  );
}
