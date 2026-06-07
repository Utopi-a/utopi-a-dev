import { z } from "zod";
import { shotTypes } from "./shot-type";

export const ammoTypeSchema = z.object({
  name: z.string().max(100).optional(),
  caliber: z.string().min(1).max(30),
  shotType: z.enum(shotTypes),
  gaugeNumber: z.string().max(20).optional(),
  roundsPerBox: z.number().int().positive(),
  defaultPurpose: z.string().max(200).optional(),
  memo: z.string().max(500).optional(),
});

export type AmmoTypeInput = z.infer<typeof ammoTypeSchema>;
