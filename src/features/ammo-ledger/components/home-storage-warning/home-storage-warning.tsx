import { formatStockQuantity } from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import { homeStorageRoundLimit } from "@/features/ammo-ledger/schema/home-storage-limit";
import { cn } from "@/lib/cn";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

type HomeStorageWarningProps = {
  currentStock: number;
  peakStock: number;
  /** 最後に目安を超えた記録の日付 */
  lastExceededOn?: string | null;
  variant?: "banner" | "inline";
};

export function HomeStorageWarning({
  currentStock,
  peakStock,
  lastExceededOn,
  variant = "banner",
}: HomeStorageWarningProps) {
  const isCurrentlyExceeded = currentStock > homeStorageRoundLimit;
  const hasExceededBefore = peakStock > homeStorageRoundLimit;

  if (!isCurrentlyExceeded && !hasExceededBefore) {
    return null;
  }

  const message = isCurrentlyExceeded
    ? `帳簿上の現在残数が ${formatStockQuantity({ quantity: currentStock })}で、自宅保管の目安（${formatStockQuantity({ quantity: homeStorageRoundLimit })}）を超えています。`
    : `過去に帳簿残数が ${formatStockQuantity({ quantity: peakStock })}まで達しており、自宅保管の目安（${formatStockQuantity({ quantity: homeStorageRoundLimit })}）を超えた時期があります${lastExceededOn ? `（最後は ${formatIsoDateForDisplay({ value: lastExceededOn })}）` : ""}。`;

  return (
    <div
      className={cn(
        "text-sm",
        variant === "banner"
          ? "rounded-lg border border-amber-500/35 bg-amber-500/5 px-4 py-3"
          : "text-amber-800 dark:text-amber-200",
      )}
    >
      <p className="font-medium text-amber-800 dark:text-amber-200">{message}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        自宅保管は実包・空包の合計{homeStorageRoundLimit}
        個までが目安です。消費・譲渡・廃棄の記録漏れがないか確認してください。
      </p>
    </div>
  );
}
