import { z } from "zod";

export const counterpartyKinds = ["shop", "person"] as const;
export type CounterpartyKind = (typeof counterpartyKinds)[number];

export const counterpartySchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(300),
  kind: z.enum(counterpartyKinds).default("shop"),
  memo: z.string().max(500).optional(),
});

export type CounterpartyInput = z.infer<typeof counterpartySchema>;
