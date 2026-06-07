import { z } from "zod";
import type { inputKinds } from "./input-kind";

export const transactionStatuses = ["draft", "confirmed", "voided"] as const;
export type TransactionStatus = (typeof transactionStatuses)[number];

const baseTransactionSchema = z.object({
  occurredOn: z.string().date(),
  ammoTypeId: z.string().min(1),
  boxCount: z.number().int().min(0).default(0),
  looseRounds: z.number().int().default(0),
  memo: z.string().max(500).optional(),
});

export const consumeTransactionSchema = baseTransactionSchema.extend({
  inputKind: z.literal("consume"),
  gunId: z.string().min(1),
  rangeId: z.string().min(1),
});

export const acquireTransactionSchema = baseTransactionSchema.extend({
  inputKind: z.literal("acquire"),
  counterpartyName: z.string().min(1).max(100),
  counterpartyAddress: z.string().min(1).max(300),
});

export const disposeTransactionSchema = baseTransactionSchema.extend({
  inputKind: z.literal("dispose"),
});

export const transferTransactionSchema = baseTransactionSchema.extend({
  inputKind: z.literal("transfer"),
  counterpartyName: z.string().min(1).max(100),
  counterpartyAddress: z.string().min(1).max(300),
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
