"use client";

import type { ReactNode, RefObject } from "react";
import { PrefectureJumpNav } from "@/features/ammo-ledger/components/prefecture-jump-nav/prefecture-jump-nav";
import { cn } from "@/lib/cn";

type CatalogScrollPaneProps = {
  scrollRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  showPrefectureRail: boolean;
  prefectures: string[];
  onJumpPrefecture: ({ prefecture }: { prefecture: string }) => void;
  className?: string;
};

export function CatalogScrollPane({
  scrollRef,
  children,
  showPrefectureRail,
  prefectures,
  onJumpPrefecture,
  className,
}: CatalogScrollPaneProps) {
  if (!showPrefectureRail) {
    return (
      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain catalog-scroll-list",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={cn("grid min-h-0 flex-1 grid-cols-[1fr_4.75rem] overflow-hidden", className)}>
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
