import type { InputKind } from "@/features/ammo-ledger/schema/input-kind";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";

export function mapCategoryToInputKind({
  category,
}: {
  category: LedgerCategory;
}): InputKind | null {
  switch (category) {
    case "consume":
      return "consume";
    case "acquire":
      return "acquire";
    case "dispose":
      return "dispose";
    case "transfer":
      return "transfer";
    case "manufacture":
      return null;
  }
}
