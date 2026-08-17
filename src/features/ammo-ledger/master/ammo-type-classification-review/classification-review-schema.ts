import { z } from "zod";
import { cartridgeTypes } from "@/features/ammo-ledger/schema/cartridge-type";

export const confirmClassificationSchema = z.object({
  ammoTypeId: z.string().min(1),
  cartridgeType: z.enum(cartridgeTypes),
  caliber: z.string().min(1).max(30),
  gaugeNumber: z.string().max(20).optional(),
});

export type ConfirmClassificationInput = z.infer<typeof confirmClassificationSchema>;

export const correctOrphanEntrySchema = z.object({
  ledgerEntryId: z.string().min(1),
  cartridgeType: z.enum(cartridgeTypes),
  caliber: z.string().min(1).max(30),
  gaugeNumber: z.string().max(20).optional(),
});

export type CorrectOrphanEntryInput = z.infer<typeof correctOrphanEntrySchema>;
