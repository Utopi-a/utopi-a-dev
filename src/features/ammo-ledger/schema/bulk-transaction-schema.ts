import { z } from "zod";
import {
  acquireTransactionSchema,
  consumeTransactionSchema,
} from "@/features/ammo-ledger/schema/transaction-schema";

export const bulkEntryInputSchema = z.union([consumeTransactionSchema, acquireTransactionSchema]);

export const bulkTransactionsInputSchema = z.object({
  entries: z.array(bulkEntryInputSchema).min(1),
});

export type BulkEntryInput = z.infer<typeof bulkEntryInputSchema>;
