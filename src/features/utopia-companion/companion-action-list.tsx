import { CheckIcon, XIcon } from "lucide-react";
import type { CompanionAction } from "@/features/utopia-companion/companion-agent";

/** 返事の前に使った道具。開くと、道具がモデルに返した結果をそのまま見られる */
export function CompanionActionList({ actions }: { actions: readonly CompanionAction[] }) {
  return (
    <ul className="space-y-1 text-xs text-muted-foreground">
      {actions.map((action, index) => (
        // 1 回の返事の中で追記だけするので、位置で区別してよい
        // biome-ignore lint/suspicious/noArrayIndexKey: 追記だけの記録
        <li key={index}>
          <details>
            <summary className="flex cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden">
              {action.isSuccess ? (
                <CheckIcon className="size-3.5 shrink-0 text-primary" />
              ) : (
                <XIcon className="size-3.5 shrink-0 text-destructive" />
              )}
              {action.description.replace(/…$/, "")}
            </summary>
            <p className="mt-1 whitespace-pre-wrap break-words rounded-md bg-muted px-2 py-1.5">
              {action.result}
            </p>
          </details>
        </li>
      ))}
    </ul>
  );
}
