import { z } from "zod";

export const rangeSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(300),
  defaultPurpose: z.string().max(200).optional(),
  memo: z.string().max(500).optional(),
});

export type RangeInput = z.infer<typeof rangeSchema>;
