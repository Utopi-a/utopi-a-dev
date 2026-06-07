import { z } from "zod";

export const gunSchema = z.object({
  name: z.string().min(1).max(100),
  permitNumber: z.string().min(1).max(50),
  gunType: z.string().min(1).max(50),
  caliber: z.string().min(1).max(30),
  purpose: z.string().max(200).optional(),
  memo: z.string().max(500).optional(),
});

export type GunInput = z.infer<typeof gunSchema>;
