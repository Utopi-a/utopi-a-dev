import type { LedgerCategory } from "./ledger-category";

export const inputKinds = ["consume", "acquire", "dispose", "transfer", "stock_check"] as const;

export type InputKind = (typeof inputKinds)[number];

export function mapInputKindToCategory({
  inputKind,
}: {
  inputKind: InputKind;
}): LedgerCategory | null {
  switch (inputKind) {
    case "consume":
      return "consume";
    case "acquire":
      return "acquire";
    case "dispose":
      return "dispose";
    case "transfer":
      return "transfer";
    case "stock_check":
      return null;
  }
}
