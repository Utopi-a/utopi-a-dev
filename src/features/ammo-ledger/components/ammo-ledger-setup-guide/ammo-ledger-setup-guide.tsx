import Link from "next/link";
import {
  buildSetupChecklist,
  type SetupChecklistRequirement,
} from "@/features/ammo-ledger/onboarding/build-setup-checklist/build-setup-checklist";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import { cn } from "@/lib/cn";

const requirementLabels: Record<SetupChecklistRequirement, string> = {
  required: "必須",
  recommended: "推奨",
  optional: "任意",
};

type AmmoLedgerSetupGuideProps = {
  workspace: AmmoLedgerWorkspace;
};

export function AmmoLedgerSetupGuide({ workspace }: AmmoLedgerSetupGuideProps) {
  const { items, nextRequiredItemId } = buildSetupChecklist({ workspace });

  if (nextRequiredItemId === null) {
    return null;
  }

  return (
    <section
      aria-labelledby="ammo-ledger-setup-guide-heading"
      className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5"
    >
      <div className="space-y-1">
        <h2 id="ammo-ledger-setup-guide-heading" className="text-base font-semibold">
          はじめに登録してください
        </h2>
        <p className="text-sm text-muted-foreground">
          記録を入力する前に、必須の項目を上から順に登録します。
        </p>
      </div>
      <ol className="space-y-2">
        {items.map((item, index) => {
          const isNext = item.id === nextRequiredItemId;

          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={isNext ? "step" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                  isNext
                    ? "border-primary/60 bg-background hover:bg-muted/40"
                    : "border-border/60 bg-background/60 hover:bg-muted/40",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    item.isDone
                      ? "bg-primary text-primary-foreground"
                      : isNext
                        ? "bg-primary/15 text-primary ring-1 ring-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.isDone ? "✓" : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {requirementLabels[item.requirement]}
                    </span>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {item.isDone ? "登録済み" : item.description}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "shrink-0 text-xs",
                    isNext ? "font-medium text-primary" : "text-muted-foreground",
                  )}
                >
                  {isNext ? "登録する →" : "→"}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
