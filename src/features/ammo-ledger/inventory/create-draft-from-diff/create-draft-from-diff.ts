import { computeStockDiff } from "@/features/ammo-ledger/ledger/compute-stock/compute-stock";
import { formatStockQuantity } from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import type { InputKind } from "@/features/ammo-ledger/schema/input-kind";

export type DraftSuggestion = {
  inputKind: InputKind;
  quantity: number;
  label: string;
  boxCount?: number;
};

export function createDraftSuggestionsFromDiff({
  bookStock,
  actualStock,
  roundsPerBox,
}: {
  bookStock: number;
  actualStock: number;
  roundsPerBox: number;
}): { diff: number; suggestions: DraftSuggestion[] } {
  const diff = computeStockDiff({ bookStock, actualStock });

  if (diff === 0) {
    return { diff, suggestions: [] };
  }

  const quantity = Math.abs(diff);

  if (diff < 0) {
    const suggestions: DraftSuggestion[] = [
      {
        inputKind: "consume",
        quantity,
        label: `${formatStockQuantity({ quantity })}の消費記録を作成`,
      },
    ];

    if (quantity >= roundsPerBox && quantity % roundsPerBox === 0) {
      suggestions.unshift({
        inputKind: "consume",
        quantity,
        label: `${quantity / roundsPerBox}箱分の消費記録を作成`,
        boxCount: quantity / roundsPerBox,
      });
    }

    suggestions.push(
      {
        inputKind: "dispose",
        quantity,
        label: `${formatStockQuantity({ quantity })}の廃棄記録を作成`,
      },
      {
        inputKind: "transfer",
        quantity,
        label: `${formatStockQuantity({ quantity })}の譲渡記録を作成`,
      },
    );

    return { diff, suggestions };
  }

  return {
    diff,
    suggestions: [
      {
        inputKind: "acquire",
        quantity,
        label: `${formatStockQuantity({ quantity })}の譲受記録を作成`,
      },
    ],
  };
}
