"use client";

import { StarIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CatalogKind } from "@/features/ammo-ledger/catalog/schema/catalog-kind";
import { toggleCatalogFavoriteAction } from "@/features/ammo-ledger/catalog/toggle-catalog-favorite/toggle-catalog-favorite-action";
import { useInvalidateMasterPickerData } from "@/features/ammo-ledger/catalog/use-master-picker-data/use-master-picker-data";
import { cn } from "@/lib/cn";

type CatalogFavoriteButtonProps = {
  catalogKind: CatalogKind;
  catalogId: string;
  isFavorite: boolean;
  onFavoriteChange?: ({ isFavorite }: { isFavorite: boolean }) => void;
  className?: string;
};

export function CatalogFavoriteButton({
  catalogKind,
  catalogId,
  isFavorite,
  onFavoriteChange,
  className,
}: CatalogFavoriteButtonProps) {
  const [favorite, setFavorite] = useState(isFavorite);
  const [isPending, startTransition] = useTransition();
  const invalidatePickerData = useInvalidateMasterPickerData();

  function handleToggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const previousFavorite = favorite;
    const nextFavorite = !favorite;
    setFavorite(nextFavorite);
    onFavoriteChange?.({ isFavorite: nextFavorite });

    startTransition(async () => {
      try {
        const result = await toggleCatalogFavoriteAction({ catalogKind, catalogId });
        if (!result.ok) {
          setFavorite(previousFavorite);
          onFavoriteChange?.({ isFavorite: previousFavorite });
          toast.error(result.error);
          return;
        }

        setFavorite(result.isFavorite);
        onFavoriteChange?.({ isFavorite: result.isFavorite });
        // 入力画面のピッカーにある「お気に入り」へ反映する。
        invalidatePickerData();
      } catch {
        setFavorite(previousFavorite);
        onFavoriteChange?.({ isFavorite: previousFavorite });
        toast.error("お気に入りを更新できませんでした。通信状態を確認してください。");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={favorite ? "お気に入りを解除" : "お気に入りに追加"}
      aria-pressed={favorite}
      disabled={isPending}
      onClick={handleToggle}
      className={cn("shrink-0 text-muted-foreground hover:text-amber-500", className)}
    >
      <StarIcon
        className={cn("size-4", favorite ? "fill-amber-400 text-amber-400" : "fill-transparent")}
      />
    </Button>
  );
}
