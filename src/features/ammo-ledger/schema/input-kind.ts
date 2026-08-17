import type { LedgerCategory } from "./ledger-category";

export const inputKinds = [
  "consume",
  "acquire",
  "dispose",
  "transfer",
  "manufacture",
  "issue",
  "receive",
  "stock_check",
] as const;

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
    case "manufacture":
      return "manufacture";
    case "issue":
      return "issue";
    case "receive":
      return "receive";
    case "stock_check":
      return null;
    default: {
      const _exhaustive: never = inputKind;
      return _exhaustive;
    }
  }
}
