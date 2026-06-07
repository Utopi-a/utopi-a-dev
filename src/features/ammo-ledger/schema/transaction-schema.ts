import { z } from "zod";
import type { inputKinds } from "./input-kind";

export const transactionStatuses = ["draft", "confirmed", "voided"] as const;
export type TransactionStatus = (typeof transactionStatuses)[number];

const baseTransactionSchema = z.object({
  occurredOn: z.string().date(),
  ammoTypeId: z.string().min(1),
  outerBoxCount: z.number().int().min(0).default(0),
  boxCount: z.number().int().min(0).default(0),
  looseRounds: z.number().int().default(0),
  memo: z.string().max(500).optional(),
});

const counterpartyFieldsSchema = z.object({
  counterpartyId: z.string().min(1).optional(),
  counterpartyName: z.string().min(1).max(100).optional(),
  counterpartyAddress: z.string().min(1).max(300).optional(),
});

function hasCounterparty(
  data: z.infer<typeof counterpartyFieldsSchema>,
): data is { counterpartyId: string } | { counterpartyName: string; counterpartyAddress: string } {
  if (data.counterpartyId) {
    return true;
  }
  return Boolean(data.counterpartyName && data.counterpartyAddress);
}

export const consumeTransactionSchema = baseTransactionSchema.extend({
  inputKind: z.literal("consume"),
  gunId: z.string().min(1),
  rangeId: z.string().min(1),
});

export const acquireTransactionSchema = baseTransactionSchema
  .extend({
    inputKind: z.literal("acquire"),
  })
  .merge(counterpartyFieldsSchema)
  .refine(hasCounterparty, {
    message: "譲渡元を選択するか、氏名と住所を入力してください",
  });

export const disposeTransactionSchema = baseTransactionSchema.extend({
  inputKind: z.literal("dispose"),
});

export const transferTransactionSchema = baseTransactionSchema
  .extend({
    inputKind: z.literal("transfer"),
  })
  .merge(counterpartyFieldsSchema)
  .refine(hasCounterparty, {
    message: "譲渡先を選択するか、氏名と住所を入力してください",
  });

export const stockCheckSchema = z.object({
  inputKind: z.literal("stock_check"),
  ammoTypeId: z.string().min(1),
  actualRounds: z.number().int().min(0),
});

export const transactionInputSchema = z.discriminatedUnion("inputKind", [
  consumeTransactionSchema,
  acquireTransactionSchema,
  disposeTransactionSchema,
  transferTransactionSchema,
  stockCheckSchema,
]);

export type TransactionInput = z.infer<typeof transactionInputSchema>;

export function isLedgerInputKind(
  inputKind: (typeof inputKinds)[number],
): inputKind is "consume" | "acquire" | "dispose" | "transfer" {
  return inputKind !== "stock_check";
}
