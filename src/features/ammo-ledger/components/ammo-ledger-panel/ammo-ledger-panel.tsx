import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type AmmoLedgerPanelProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function AmmoLedgerPanel({ title, description, children, className }: AmmoLedgerPanelProps) {
  return (
    <section className={cn("rounded-xl border border-border/60 bg-card/50", className)}>
      {title ? (
        <div className="border-b border-border/50 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-medium">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className={cn(title ? "px-4 py-4 sm:px-5" : "px-4 py-4 sm:px-5")}>{children}</div>
    </section>
  );
}
