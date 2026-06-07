"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PickerEntryRowProps = {
  name: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
};

export function PickerEntryRow({
  name,
  subtitle,
  leading,
  trailing,
  onSelect,
  disabled,
}: PickerEntryRowProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border/40 last:border-b-0">
      {leading}
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 px-1 py-3 text-left transition-colors",
          "hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {trailing}
      </button>
    </div>
  );
}
