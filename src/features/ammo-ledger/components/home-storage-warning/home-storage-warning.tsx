import { homeStorageRoundLimit } from "@/features/ammo-ledger/schema/home-storage-limit";
import { cn } from "@/lib/cn";

type HomeStorageWarningProps = {
  currentStock: number;
  peakStock: number;
  variant?: "banner" | "inline";
};

export function HomeStorageWarning({
  currentStock,
  peakStock,
  variant = "banner",
}: HomeStorageWarningProps) {
  const isCurrentlyExceeded = currentStock > homeStorageRoundLimit;
  const hasExceededBefore = peakStock > homeStorageRoundLimit;

  if (!isCurrentlyExceeded && !hasExceededBefore) {
    return null;
  }

  const message = isCurrentlyExceeded
    ? `帳簿上の現在残数が ${currentStock.toLocaleString("ja-JP")}発で、自宅保管の目安（${homeStorageRoundLimit}発）を超えています。`
    : `過去に帳簿残数が ${peakStock.toLocaleString("ja-JP")}発まで達しており、自宅保管の目安（${homeStorageRoundLimit}発）を超えた時期があります。`;

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
        自宅保管の上限は実包・空包の合計{homeStorageRoundLimit}
        発が目安です。射撃場での消費や譲渡・廃棄を記録すれば残数は減るため、帳簿と実態が一致していれば問題ありません。
      </p>
    </div>
  );
}
