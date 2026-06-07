"use client";

import { formatPrefectureJumpLabel } from "@/features/ammo-ledger/catalog/format-prefecture-jump-label/format-prefecture-jump-label";
import { cn } from "@/lib/cn";

type PrefectureJumpNavProps = {
  prefectures: string[];
  onJump: ({ prefecture }: { prefecture: string }) => void;
  className?: string;
};

export function PrefectureJumpNav({ prefectures, onJump, className }: PrefectureJumpNavProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <p className="shrink-0 border-b border-border/40 py-1.5 text-center text-[9px] leading-tight font-medium text-muted-foreground">
        都道府県
      </p>
      <nav
        aria-label="都道府県ジャンプ"
        className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto overscroll-contain py-1 catalog-scroll-rail"
      >
        {prefectures.map((prefecture) => (
          <button
            key={prefecture}
            type="button"
            className="shrink-0 rounded-md px-1 py-2 text-sm leading-none font-semibold text-muted-foreground transition-colors hover:bg-background/70 hover:text-primary"
            onClick={() => onJump({ prefecture })}
          >
            {formatPrefectureJumpLabel({ prefecture })}
          </button>
        ))}
      </nav>
    </div>
  );
}
