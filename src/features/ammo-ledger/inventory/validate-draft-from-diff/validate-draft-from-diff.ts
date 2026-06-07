import { computeStockDiff } from "@/features/ammo-ledger/ledger/compute-stock/compute-stock";
import type { InputKind } from "@/features/ammo-ledger/schema/input-kind";

const decreaseKinds: InputKind[] = ["consume", "dispose", "transfer"];
const increaseKinds: InputKind[] = ["acquire"];

export function validateDraftFromDiff({
  bookStock,
  actualStock,
  inputKind,
  quantity,
}: {
  bookStock: number;
  actualStock: number;
  inputKind: InputKind;
  quantity: number;
}): { valid: true } | { valid: false; error: string } {
  const diff = computeStockDiff({ bookStock, actualStock });

  if (diff === 0) {
    return { valid: false, error: "差分がありません" };
  }

  const expectedQuantity = Math.abs(diff);

  if (quantity !== expectedQuantity) {
    return { valid: false, error: "下書き数量は差分と一致している必要があります" };
  }

  if (diff < 0) {
    if (!decreaseKinds.includes(inputKind)) {
      return {
        valid: false,
        error: "実在庫が帳簿より少ない場合、譲受の下書きは作成できません",
      };
    }
    return { valid: true };
  }

  if (!increaseKinds.includes(inputKind)) {
    return {
      valid: false,
      error: "実在庫が帳簿より多い場合、消費の下書きは作成できません",
    };
  }

  return { valid: true };
}
